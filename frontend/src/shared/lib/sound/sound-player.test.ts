import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { SOUND_MAX_VOICES, SOUND_MIN_INTERVAL_MS, SOUND_RATE_MAX, SOUND_RATE_MIN } from './sound-config';
import { createSoundPlayer, type AudioContextLike } from './sound-player';

interface FakeSource {
  buffer: AudioBuffer | null;
  playbackRate: { value: number };
  onended: ((ev: Event) => void) | null;
  connect: Mock<(destination: AudioNode) => unknown>;
  start: Mock<() => void>;
}

type FakeGain = ReturnType<AudioContextLike['createGain']>;

const URLS = ['a.mp3', 'b.mp3', 'c.mp3'];
const buffers = URLS.map((url) => ({ url }) as unknown as AudioBuffer);

let sources: FakeSource[];
let resume: Mock<() => Promise<void>>;
let state: string;
let clock: number;

function fakeContext(): AudioContextLike {
  return {
    get state() {
      return state;
    },
    destination: {} as AudioNode,
    resume,
    decodeAudioData: vi.fn(async (data: ArrayBuffer) => buffers[new Uint8Array(data)[0] ?? 0]!),
    createBufferSource: () => {
      const source: FakeSource = {
        buffer: null,
        playbackRate: { value: 1 },
        onended: null,
        connect: vi.fn<(destination: AudioNode) => unknown>(),
        start: vi.fn<() => void>(),
      };
      sources.push(source);
      return source;
    },
    createGain: () => ({ gain: { value: 1 }, connect: vi.fn() }) as unknown as FakeGain,
  };
}

const fetchMock = vi.fn(async (url: string) => ({
  arrayBuffer: async () => new Uint8Array([URLS.indexOf(url)]).buffer,
}));

function make(options: { muted?: () => boolean; random?: () => number; create?: () => AudioContextLike | null } = {}) {
  return createSoundPlayer({
    urls: URLS,
    isMuted: options.muted ?? (() => false),
    createContext: options.create ?? fakeContext,
    now: () => clock,
    random: options.random ?? Math.random,
  });
}

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function playAt(player: { play(): void }, time: number) {
  clock = time;
  player.play();
  await flush();
}

describe('createSoundPlayer', () => {
  beforeEach(() => {
    sources = [];
    state = 'running';
    clock = 1000;
    resume = vi.fn<() => Promise<void>>(async () => {
      state = 'running';
    });
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => ({
      arrayBuffer: async () => new Uint8Array([URLS.indexOf(url)]).buffer,
    }));
    vi.stubGlobal('fetch', fetchMock);
  });

  it('играет звук с буфером и вариацией скорости', async () => {
    const player = make({ random: () => 0.5 });
    await playAt(player, 1000);
    expect(sources).toHaveLength(1);
    expect(sources[0]!.start).toHaveBeenCalledTimes(1);
    const rate = sources[0]!.playbackRate.value;
    expect(rate).toBeGreaterThanOrEqual(SOUND_RATE_MIN);
    expect(rate).toBeLessThanOrEqual(SOUND_RATE_MAX);
  });

  it('два вызова в пределах интервала дают один запуск', async () => {
    const player = make();
    await playAt(player, 1000);
    await playAt(player, 1000 + SOUND_MIN_INTERVAL_MS - 1);
    expect(sources).toHaveLength(1);
    await playAt(player, 1000 + SOUND_MIN_INTERVAL_MS);
    expect(sources).toHaveLength(2);
  });

  it('не больше SOUND_MAX_VOICES одновременно, после окончания слот освобождается', async () => {
    const player = make();
    for (let i = 0; i <= SOUND_MAX_VOICES; i++) await playAt(player, 1000 + i * SOUND_MIN_INTERVAL_MS);
    expect(sources).toHaveLength(SOUND_MAX_VOICES);
    sources[0]!.onended?.(new Event('ended'));
    await playAt(player, 5000);
    expect(sources).toHaveLength(SOUND_MAX_VOICES + 1);
  });

  it('не повторяет тот же файл подряд', async () => {
    const player = make();
    const played: string[] = [];
    for (let i = 0; i < 30; i++) {
      await playAt(player, 1000 + i * SOUND_MIN_INTERVAL_MS);
      const source = sources.at(-1)!;
      source.onended?.(new Event('ended'));
      played.push((source.buffer as unknown as { url: string }).url);
    }
    expect(played).toHaveLength(30);
    for (let i = 1; i < played.length; i++) expect(played[i]).not.toBe(played[i - 1]);
    expect(new Set(played).size).toBe(3);
  });

  it('при mute не играет и не создаёт контекст', async () => {
    const create = vi.fn(fakeContext);
    const player = make({ muted: () => true, create });
    await playAt(player, 1000);
    expect(create).not.toHaveBeenCalled();
    expect(sources).toHaveLength(0);
  });

  it('контекст создаётся лениво один раз, буферы загружаются один раз', async () => {
    const create = vi.fn(fakeContext);
    const player = make({ create });
    expect(create).not.toHaveBeenCalled();
    await playAt(player, 1000);
    await playAt(player, 2000);
    expect(create).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(URLS.length);
  });

  it('приостановленный контекст возобновляется', async () => {
    state = 'suspended';
    const player = make();
    await playAt(player, 1000);
    expect(resume).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(1);
  });

  it('ошибка загрузки не бросает исключение, следующая попытка пробует снова', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    const player = make();
    await expect(playAt(player, 1000)).resolves.toBeUndefined();
    expect(sources).toHaveLength(0);
    await playAt(player, 2000);
    expect(sources).toHaveLength(1);
  });

  it('без Web Audio молча ничего не делает', async () => {
    const player = make({ create: () => null });
    await expect(playAt(player, 1000)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('падение создания контекста не бросает исключение', async () => {
    const player = make({
      create: () => {
        throw new Error('no audio');
      },
    });
    await expect(playAt(player, 1000)).resolves.toBeUndefined();
  });

  it('preload скачивает файлы без создания контекста, play потом не делает fetch повторно', async () => {
    const create = vi.fn(fakeContext);
    const player = make({ create });
    player.preload();
    player.preload();
    await flush();
    expect(fetchMock).toHaveBeenCalledTimes(URLS.length);
    expect(create).not.toHaveBeenCalled();
    await playAt(player, 1000);
    expect(fetchMock).toHaveBeenCalledTimes(URLS.length);
    expect(create).toHaveBeenCalledTimes(1);
    expect(sources).toHaveLength(1);
  });

  it('декодирует копии буферов, исходные не отдаются decodeAudioData', async () => {
    const decoded: ArrayBuffer[] = [];
    const player = make({
      create: () => {
        const ctx = fakeContext();
        ctx.decodeAudioData = async (data: ArrayBuffer) => {
          decoded.push(data);
          return buffers[0]!;
        };
        return ctx;
      },
    });
    player.preload();
    await playAt(player, 1000);
    expect(decoded).toHaveLength(URLS.length);
  });

  it('ошибка preload молча игнорируется, play повторяет загрузку', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network'));
    const player = make();
    expect(() => player.preload()).not.toThrow();
    await flush();
    await playAt(player, 1000);
    expect(sources).toHaveLength(1);
  });
});

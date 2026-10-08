import { SOUND_MAX_VOICES, SOUND_MIN_INTERVAL_MS, SOUND_RATE_MAX, SOUND_RATE_MIN, SOUND_VOLUME } from './sound-config';

interface SourceLike {
  buffer: AudioBuffer | null;
  playbackRate: { value: number };
  onended: ((ev: Event) => void) | null;
  connect(destination: AudioNode): unknown;
  start(): void;
}

interface GainLike extends AudioNode {
  gain: { value: number };
}

export interface AudioContextLike {
  state: string;
  destination: AudioNode;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>;
  createBufferSource(): SourceLike;
  createGain(): GainLike;
}

export interface SoundPlayerOptions {
  urls: readonly string[];
  isMuted: () => boolean;
  createContext?: () => AudioContextLike | null;
  now?: () => number;
  random?: () => number;
}

export interface SoundPlayer {
  play(): void;
  preload(): void;
}

function defaultCreateContext(): AudioContextLike | null {
  try {
    return typeof AudioContext === 'undefined' ? null : new AudioContext();
  } catch {
    return null;
  }
}

export function createSoundPlayer({
  urls,
  isMuted,
  createContext = defaultCreateContext,
  now = () => performance.now(),
  random = Math.random,
}: SoundPlayerOptions): SoundPlayer {
  let context: AudioContextLike | null = null;
  let master: GainLike | null = null;
  let raw: Promise<ArrayBuffer[]> | null = null;
  let decoded: Promise<AudioBuffer[]> | null = null;
  let lastStart = Number.NEGATIVE_INFINITY;
  let lastIndex = -1;
  let voices = 0;

  function ensureContext(): AudioContextLike | null {
    if (context) return context;
    const created = createContext();
    if (!created) return null;
    const gain = created.createGain();
    gain.gain.value = SOUND_VOLUME;
    gain.connect(created.destination);
    context = created;
    master = gain;
    return created;
  }

  async function downloadAll(): Promise<ArrayBuffer[]> {
    try {
      return await Promise.all(urls.map(async (url) => (await fetch(url)).arrayBuffer()));
    } catch (error) {
      raw = null;
      throw error;
    }
  }

  function fetchRaw(): Promise<ArrayBuffer[]> {
    raw ??= downloadAll();
    return raw;
  }

  async function decodeWith(ctx: AudioContextLike): Promise<AudioBuffer[]> {
    try {
      const items = await fetchRaw();
      return await Promise.all(items.map((item) => ctx.decodeAudioData(item.slice(0))));
    } catch (error) {
      decoded = null;
      throw error;
    }
  }

  function decodeAll(ctx: AudioContextLike): Promise<AudioBuffer[]> {
    decoded ??= decodeWith(ctx);
    return decoded;
  }

  async function preloadSilently(): Promise<void> {
    try {
      await fetchRaw();
    } catch {
      return;
    }
  }

  function pickIndex(): number {
    if (urls.length <= 1) return 0;
    const candidate = Math.floor(random() * (urls.length - 1));
    const index = candidate >= lastIndex && lastIndex >= 0 ? candidate + 1 : candidate;
    lastIndex = index;
    return index;
  }

  function start(ctx: AudioContextLike, buffer: AudioBuffer): void {
    if (!master || voices >= SOUND_MAX_VOICES) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = SOUND_RATE_MIN + random() * (SOUND_RATE_MAX - SOUND_RATE_MIN);
    source.connect(master);
    voices += 1;
    source.onended = () => {
      voices -= 1;
    };
    source.start();
  }

  async function run(index: number): Promise<void> {
    try {
      const ctx = ensureContext();
      if (!ctx) return;
      const resumed = ctx.state === 'suspended' ? ctx.resume() : Promise.resolve();
      const [loaded] = await Promise.all([decodeAll(ctx), resumed]);
      const buffer = loaded[index];
      if (buffer) start(ctx, buffer);
    } catch {
      return;
    }
  }

  return {
    preload() {
      void preloadSilently();
    },
    play() {
      if (isMuted()) return;
      const time = now();
      if (time - lastStart < SOUND_MIN_INTERVAL_MS) return;
      lastStart = time;
      void run(pickIndex());
    },
  };
}

import { createSoundPlayer } from '@/shared/lib/sound/sound-player';
import { isSoundMuted } from '@/shared/lib/sound/sound-muted-store';
import goose1 from '@/shared/assets/sounds/goose-1.mp3';
import goose2 from '@/shared/assets/sounds/goose-2.mp3';
import goose3 from '@/shared/assets/sounds/goose-3.mp3';

const player = createSoundPlayer({ urls: [goose1, goose2, goose3], isMuted: isSoundMuted });

export function playGooseSound(): void {
  player.play();
}

export function preloadGooseSound(): void {
  player.preload();
}

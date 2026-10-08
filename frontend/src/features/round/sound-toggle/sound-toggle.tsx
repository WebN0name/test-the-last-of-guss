import { Volume2, VolumeX } from 'lucide-react';
import { useSoundMuted } from '@/shared/lib/sound/use-sound-muted';
import { Button } from '@/shared/ui/button';

export function SoundToggle() {
  const { muted, toggle } = useSoundMuted();
  const Icon = muted ? VolumeX : Volume2;
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={toggle}
      aria-label="Звук гуся"
      aria-pressed={!muted}
      className="size-11 rounded-full p-0 text-muted-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <Icon className="size-5" aria-hidden="true" />
    </Button>
  );
}

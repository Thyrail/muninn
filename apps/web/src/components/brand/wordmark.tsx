import { cn } from '@/lib/utils';
import { RavenMark } from './raven-mark';

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <RavenMark className="size-6 text-primary" />
      <span className="font-heading text-xl font-medium tracking-tight">Muninn</span>
    </span>
  );
}

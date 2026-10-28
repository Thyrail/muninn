import type { ProcessingStatus } from '@muninn/shared';
import { AlertCircleIcon, CheckIcon, LoaderCircleIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LABELS: Record<ProcessingStatus, string> = {
  PENDING: 'Wartet',
  PROCESSING: 'Wird verarbeitet',
  READY: 'Bereit',
  FAILED: 'Fehler',
};

export function SourceStatusBadge({ status }: { status: ProcessingStatus }) {
  if (status === 'READY') {
    return (
      <Badge variant="outline" className="gap-1 text-muted-foreground">
        <CheckIcon className="size-3" />
        {LABELS.READY}
      </Badge>
    );
  }
  if (status === 'FAILED') {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircleIcon className="size-3" />
        {LABELS.FAILED}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1" aria-live="polite">
      <LoaderCircleIcon className="size-3 animate-spin" />
      {LABELS[status]}
    </Badge>
  );
}

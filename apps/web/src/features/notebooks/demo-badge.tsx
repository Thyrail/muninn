import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/** Marks the curated demo notebook, which visitors can use but not rename or delete. */
export function DemoBadge({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" className={className} tabIndex={0}>
          Demo
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-60">
        Beispiel-Notebook für alle Besucher. Du kannst damit arbeiten; was du hinzufügst, wird
        nachts entfernt.
      </TooltipContent>
    </Tooltip>
  );
}

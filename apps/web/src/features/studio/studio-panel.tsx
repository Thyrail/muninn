import { AudioLinesIcon, FileTextIcon, MessageCircleQuestionMarkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const OUTPUTS = [
  { title: 'Briefing', description: 'Kompakter Überblick über alle Quellen', Icon: FileTextIcon },
  {
    title: 'FAQ',
    description: 'Häufige Fragen mit belegten Antworten',
    Icon: MessageCircleQuestionMarkIcon,
  },
  {
    title: 'Rabenbericht',
    description: 'Hugin & Munin sprechen über deine Quellen',
    Icon: AudioLinesIcon,
  },
] as const;

/** Studio column. Generating outputs follows in phase 5; until then the cards are inactive. */
export function StudioPanel() {
  return (
    <section aria-labelledby="studio-heading" className="flex h-full min-h-0 flex-col">
      <h2 id="studio-heading" className="font-heading text-lg font-medium">
        Studio
      </h2>
      <p className="text-xs text-muted-foreground">Aus deinen Quellen erstellt</p>
      <ul className="mt-4 space-y-2 overflow-y-auto">
        {OUTPUTS.map(({ title, description, Icon }) => (
          <li
            key={title}
            aria-disabled="true"
            className="flex items-start gap-3 rounded-lg border border-dashed p-3 text-muted-foreground"
          >
            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-foreground/80">{title}</p>
                <Badge
                  variant="outline"
                  className="text-[0.7rem] font-normal text-muted-foreground"
                >
                  Folgt in Kürze
                </Badge>
              </div>
              <p className="mt-1 text-xs">{description}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

'use client';

import { Button } from '@/components/ui/button';

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <h1 className="font-heading text-2xl font-medium">Da ist etwas schiefgelaufen</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Die Seite konnte nicht geladen werden. Bitte versuche es noch einmal.
      </p>
      <Button className="mt-6" onClick={reset}>
        Erneut versuchen
      </Button>
    </div>
  );
}

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-20 text-center">
      <h1 className="font-heading text-2xl font-medium">Nicht gefunden</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Dieses Notebook gibt es nicht oder es gehört nicht zu deinem Konto.
      </p>
      <Button asChild className="mt-6">
        <Link href="/">Zu deinen Notebooks</Link>
      </Button>
    </div>
  );
}

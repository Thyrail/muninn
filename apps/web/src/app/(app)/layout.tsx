import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Wordmark } from '@/components/brand/wordmark';
import { Providers } from '@/components/providers';
import { ThemeToggle } from '@/components/theme-toggle';
import { UserMenu } from '@/components/user-menu';
import { getCurrentUser } from '@/lib/api.server';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <Providers>
      <div className="flex min-h-dvh flex-col">
        <header className="flex items-center justify-between border-b px-6 py-3">
          <Link href="/" aria-label="Zur Übersicht">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </Providers>
  );
}

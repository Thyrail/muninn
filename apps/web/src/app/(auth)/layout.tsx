import Image from 'next/image';
import type { ReactNode } from 'react';
import { Wordmark } from '@/components/brand/wordmark';
import { ThemeToggle } from '@/components/theme-toggle';
import ravens from '../../../public/brand/ravens-square.jpg';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="flex flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <Wordmark />
          <ThemeToggle />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pb-16">
          <div className="w-full max-w-sm">{children}</div>
        </main>
        <footer className="px-6 py-4 text-center text-xs text-muted-foreground">
          Muninn, benannt nach Odins Raben der Erinnerung.
        </footer>
      </div>
      {/* Hugin and Munin; decorative, so the form stays the only content on small screens. */}
      <div className="relative hidden bg-[#1b1e25] lg:block">
        <Image
          src={ravens}
          alt=""
          fill
          priority
          sizes="50vw"
          placeholder="blur"
          className="object-cover"
        />
      </div>
    </div>
  );
}

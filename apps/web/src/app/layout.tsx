import type { Metadata } from 'next';
import { Fraunces, Geist } from 'next/font/google';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces' });

const DESCRIPTION =
  'Muninn beantwortet Fragen ausschließlich aus deinen Quellen und belegt jede Aussage mit Zitaten.';

export async function generateMetadata(): Promise<Metadata> {
  // Read at request time: the public URL comes from the container environment, not the build.
  await connection();
  return {
    metadataBase: new URL(process.env.BETTER_AUTH_URL ?? 'http://localhost:3000'),
    title: { default: 'Muninn', template: '%s · Muninn' },
    description: DESCRIPTION,
    applicationName: 'Muninn',
    openGraph: { siteName: 'Muninn', locale: 'de_DE', type: 'website', description: DESCRIPTION },
  };
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" suppressHydrationWarning className={`${geist.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser, getPublicConfig } from '@/lib/api.server';
import { LoginForm, type DemoCredentials } from './login-form';

export const metadata: Metadata = { title: 'Anmelden' };

function demoCredentials(): DemoCredentials | null {
  const { SHOW_DEMO_LOGIN, DEMO_USER_EMAIL, DEMO_USER_PASSWORD } = process.env;
  if (SHOW_DEMO_LOGIN !== 'true' || !DEMO_USER_EMAIL || !DEMO_USER_PASSWORD) return null;
  return { email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD };
}

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/');
  const { allowSignup } = await getPublicConfig();

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl font-medium tracking-tight">Willkommen zurück</h1>
        <p className="text-sm text-muted-foreground">
          Melde dich an, um mit deinen Quellen zu arbeiten.
        </p>
      </div>
      <LoginForm demo={demoCredentials()} />
      {allowSignup && (
        <p className="text-center text-sm text-muted-foreground">
          Noch kein Konto?{' '}
          <Link href="/register" className="text-primary underline-offset-4 hover:underline">
            Registrieren
          </Link>
        </p>
      )}
    </div>
  );
}

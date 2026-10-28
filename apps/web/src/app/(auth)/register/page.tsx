import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getCurrentUser, getPublicConfig } from '@/lib/api.server';
import { RegisterForm } from './register-form';

export const metadata: Metadata = { title: 'Registrieren' };

export default async function RegisterPage() {
  const { allowSignup } = await getPublicConfig();
  if (!allowSignup) notFound();
  if (await getCurrentUser()) redirect('/');

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="font-heading text-3xl font-medium tracking-tight">Konto erstellen</h1>
        <p className="text-sm text-muted-foreground">
          Lade Quellen hoch und lass Muninn sich für dich erinnern.
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Schon registriert?{' '}
        <Link href="/login" className="text-primary underline-offset-4 hover:underline">
          Anmelden
        </Link>
      </p>
    </div>
  );
}

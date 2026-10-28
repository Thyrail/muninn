'use client';

import { loginSchema } from '@muninn/shared';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/form-field';
import { authClient } from '@/lib/auth-client';
import { authErrorMessage } from '@/lib/auth-errors';
import { fieldErrors, type FieldErrors } from '@/lib/form';

export interface DemoCredentials {
  email: string;
  password: string;
}

export function LoginForm({ demo }: { demo: DemoCredentials | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function signIn(input: unknown) {
    const parsed = loginSchema.safeParse(input);
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signIn.email(parsed.data);
    if (error) {
      setPending(false);
      toast.error(authErrorMessage(error));
      return;
    }
    router.replace('/');
    router.refresh();
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void signIn(Object.fromEntries(new FormData(event.currentTarget)));
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormField
          id="email"
          name="email"
          type="email"
          label="E-Mail"
          autoComplete="email"
          error={errors.email}
        />
        <FormField
          id="password"
          name="password"
          type="password"
          label="Passwort"
          autoComplete="current-password"
          error={errors.password}
        />
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Anmeldung läuft …' : 'Anmelden'}
        </Button>
      </form>
      {demo && (
        <div className="rounded-lg border border-dashed p-4 text-sm">
          <p className="text-muted-foreground">
            Demo-Zugang: <span className="text-foreground">{demo.email}</span>
          </p>
          <Button
            type="button"
            variant="secondary"
            className="mt-3 w-full"
            disabled={pending}
            onClick={() => void signIn(demo)}
          >
            Mit Demo-Konto anmelden
          </Button>
        </div>
      )}
    </div>
  );
}

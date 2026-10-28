'use client';

import { PASSWORD_MIN_LENGTH, registerSchema } from '@muninn/shared';
import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { authClient } from '@/lib/auth-client';
import { authErrorMessage } from '@/lib/auth-errors';
import { fieldErrors, type FieldErrors } from '@/lib/form';

export function RegisterForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = registerSchema.safeParse(Object.fromEntries(new FormData(event.currentTarget)));
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error));
      return;
    }
    setErrors({});
    setPending(true);
    const { error } = await authClient.signUp.email(parsed.data);
    if (error) {
      setPending(false);
      toast.error(authErrorMessage(error));
      return;
    }
    router.replace('/');
    router.refresh();
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="space-y-4" noValidate>
      <FormField id="name" name="name" label="Name" autoComplete="name" error={errors.name} />
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
        autoComplete="new-password"
        description={`Mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`}
        error={errors.password}
      />
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? 'Konto wird erstellt …' : 'Registrieren'}
      </Button>
    </form>
  );
}

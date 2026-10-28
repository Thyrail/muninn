import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const loginSchema = z.object({
  email: z.email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z.string().min(1, 'Bitte gib dein Passwort ein.'),
});

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib deinen Namen ein.').max(80, 'Der Name ist zu lang.'),
  email: z.email('Bitte gib eine gültige E-Mail-Adresse ein.'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `Das Passwort braucht mindestens ${PASSWORD_MIN_LENGTH} Zeichen.`)
    .max(PASSWORD_MAX_LENGTH, 'Das Passwort ist zu lang.'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

/** Public, non-secret runtime config served by `GET /api/config`. */
export const publicConfigSchema = z.object({
  allowSignup: z.boolean(),
});

export type PublicConfig = z.infer<typeof publicConfigSchema>;

/** Maps Better Auth error codes and HTTP statuses to German UI messages. */
const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: 'E-Mail oder Passwort ist falsch.',
  USER_ALREADY_EXISTS: 'Für diese E-Mail-Adresse gibt es schon ein Konto.',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Für diese E-Mail-Adresse gibt es schon ein Konto.',
  EMAIL_PASSWORD_SIGN_UP_DISABLED: 'Die Registrierung ist derzeit geschlossen.',
  PASSWORD_TOO_SHORT: 'Das Passwort ist zu kurz.',
  PASSWORD_TOO_LONG: 'Das Passwort ist zu lang.',
  INVALID_EMAIL: 'Bitte gib eine gültige E-Mail-Adresse ein.',
};

export function authErrorMessage(error: { code?: string; status?: number } | null | undefined) {
  if (error?.status === 429) return 'Zu viele Versuche. Bitte warte einen Moment.';
  if (error?.code && MESSAGES[error.code]) return MESSAGES[error.code];
  return 'Das hat nicht geklappt. Bitte versuche es erneut.';
}

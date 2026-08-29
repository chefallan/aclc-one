/**
 * NextAuth reports failures as short codes — "CredentialsSignin",
 * "SessionRequired". Those are for the log. This is what the person reads.
 *
 * Two screens need the same translation: the sign-in form, which receives a
 * code back from signIn(), and /auth/error, which NextAuth redirects to with
 * the code in the query string.
 */
const MESSAGES: Record<string, string> = {
  // The password was wrong, or the email has no account. Which of the two is
  // deliberately not said: answering that question is how a stranger finds out
  // who studies here.
  CredentialsSignin: "That email and password don't match. Check both and try again.",
  SessionRequired: "Please sign in to continue.",
  AccessDenied: "That account isn't allowed in. Speak to the registrar if you think it should be.",
  Verification: "That link has expired or was already used. Request a new one.",
  Configuration:
    "Sign-in is misconfigured on our side, so this is not something you can fix. Please tell the registrar.",
  Default: "Something went wrong signing you in. Try again in a moment.",
};

/**
 * A code we publish copy for becomes that copy. Anything else is either a
 * message thrown by the credentials check — which is already written for the
 * person — or an unknown code, which must not be shown raw.
 */
export function authErrorMessage(code: string | null | undefined): string {
  if (!code) return MESSAGES.Default;
  if (MESSAGES[code]) return MESSAGES[code];
  // Codes are single CamelCase words; a message thrown by authorize() has
  // spaces and punctuation, and is safe to show as-is.
  return /\s/.test(code) ? code : MESSAGES.Default;
}

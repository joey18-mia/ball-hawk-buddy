/**
 * Pure validation helpers — no framework, no I/O. Safe to unit test and reuse.
 */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 8;

/** Allowed username: letters, numbers, underscore; must start with a letter. */
const USERNAME_RE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_RE.test(email.trim())) return "Enter a valid email address.";
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  return null;
}

/** Normalizes to lowercase; usernames are case-insensitive-unique by convention. */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function validateUsername(username: string): string | null {
  const u = username.trim();
  if (!u) return "Username is required.";
  if (u.length < USERNAME_MIN) {
    return `Username must be at least ${USERNAME_MIN} characters.`;
  }
  if (u.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MAX} characters or fewer.`;
  }
  if (!USERNAME_RE.test(u)) {
    return "Use letters, numbers, or underscores; start with a letter.";
  }
  return null;
}

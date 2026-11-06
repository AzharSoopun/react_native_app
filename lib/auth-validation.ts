export type AuthFieldErrors = Partial<
  Record<"firstName" | "lastName" | "emailAddress" | "password" | "confirmPassword" | "code", string>
>;

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return "Enter your email address.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Enter a valid email address.";
  return undefined;
}

export function getPasswordError(password: string): string | undefined {
  if (!password) return "Enter your password.";
  if (password.length < 8) return "Use at least 8 characters.";
  return undefined;
}

export function getCodeError(code: string): string | undefined {
  if (!code.trim()) return "Enter the verification code.";
  if (!/^[0-9\s-]{4,12}$/.test(code.trim())) return "Check the code and try again.";
  return undefined;
}

export function maskEmailAddress(emailAddress: string): string {
  const [localPart, domain] = emailAddress.trim().split("@");
  if (!localPart || !domain) return emailAddress;
  const visiblePart = localPart.length > 2 ? `${localPart[0]}•••${localPart.at(-1)}` : `${localPart[0]}•`;
  return `${visiblePart}@${domain}`;
}

export function getClerkErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;
  const clerkError = error as { longMessage?: unknown; message?: unknown };
  if (typeof clerkError.longMessage === "string" && clerkError.longMessage.trim()) {
    return clerkError.longMessage;
  }
  if (typeof clerkError.message === "string" && clerkError.message.trim()) {
    return clerkError.message;
  }
  return fallback;
}

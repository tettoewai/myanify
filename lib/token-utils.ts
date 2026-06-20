import crypto from "crypto";

export const TOKEN_EXPIRY = {
  VERIFICATION: 24, // hours
  PASSWORD_RESET: 1, // hours
};

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function getExpiryDate(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

export function isTokenExpired(expiryDate: Date | null): boolean {
  if (!expiryDate) return true;
  return new Date() > expiryDate;
}

export function getRemainingTime(
  expiryDate: Date | null,
): { hours: number; minutes: number } | null {
  if (!expiryDate) return null;

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();

  if (diffMs <= 0) return null;

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return { hours, minutes };
}

export function formatRemainingTime(expiryDate: Date | null): string {
  const remaining = getRemainingTime(expiryDate);
  if (!remaining) return "Expired";

  const { hours, minutes } = remaining;

  if (hours > 0) {
    return `${hours}h ${minutes}m remaining`;
  }

  return `${minutes}m remaining`;
}

import crypto from 'crypto';

/**
 * Generates an URL-safe, human-readable invitation code.
 * Format: 8-10 uppercase alphanumeric characters (excluding ambiguous chars like 0, O, 1, I).
 */
export function generateInviteCode(length = 8): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

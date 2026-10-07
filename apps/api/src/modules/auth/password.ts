import { createHash, randomBytes } from 'node:crypto';
import { compare, hash } from 'bcryptjs';

export function hashPassword(password: string): Promise<string> {
  return hash(password, 12);
}

export function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return compare(password, passwordHash);
}

export function randomToken(bytes = 48): string {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

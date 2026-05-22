import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, signToken, verifyToken } from '@/lib/auth';

describe('auth.ts — password hashing', () => {
  it('hashes a password to a non-equal string', async () => {
    const hash = await hashPassword('Password123!');
    expect(hash).not.toBe('Password123!');
    expect(hash.length).toBeGreaterThan(20);
  });

  it('verifies a correct password', async () => {
    const hash = await hashPassword('MySecret42');
    expect(await verifyPassword('MySecret42', hash)).toBe(true);
  });

  it('rejects an incorrect password', async () => {
    const hash = await hashPassword('MySecret42');
    expect(await verifyPassword('Wrong', hash)).toBe(false);
  });
});

describe('auth.ts — JWT', () => {
  it('signs and verifies a token', () => {
    const payload = { userId: 'abc', email: 'test@example.io', role: 'USER' };
    const token = signToken(payload);
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    const decoded = verifyToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe('abc');
    expect(decoded?.email).toBe('test@example.io');
    expect(decoded?.role).toBe('USER');
  });

  it('returns null for a tampered token', () => {
    const token = signToken({ userId: 'x', email: 'y@example.com', role: 'USER' });
    expect(verifyToken(token + 'tampered')).toBeNull();
  });

  it('returns null for an invalid token format', () => {
    expect(verifyToken('not-a-token')).toBeNull();
  });
});

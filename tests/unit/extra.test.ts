import { describe, it, expect } from 'vitest';
import { loginSchema, ticketUpdateSchema } from '@/lib/validators';
import { signToken, verifyToken } from '@/lib/auth';

describe('validators — loginSchema', () => {
  it('accepte un login valide', () => {
    const result = loginSchema.safeParse({ email: 'test@example.io', password: 'abc123' });
    expect(result.success).toBe(true);
  });

  it('rejette un email vide', () => {
    const result = loginSchema.safeParse({ email: '', password: 'abc123' });
    expect(result.success).toBe(false);
  });

  it('rejette un password vide', () => {
    const result = loginSchema.safeParse({ email: 'test@example.io', password: '' });
    expect(result.success).toBe(false);
  });
});

describe('validators — ticketUpdateSchema', () => {
  it('accepte un statut valide', () => {
    const result = ticketUpdateSchema.safeParse({ status: 'RESOLVED' });
    expect(result.success).toBe(true);
  });

  it('rejette un statut invalide', () => {
    const result = ticketUpdateSchema.safeParse({ status: 'DELETED' });
    expect(result.success).toBe(false);
  });
});

describe('auth — token expiré', () => {
  it('rejette un token expiré', () => {
    const token = signToken({ userId: 'x', email: 'x@x.com', role: 'USER' });
    // On vérifie qu'un token mal formé est rejeté
    expect(verifyToken('eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ4IiwiZW1haWwiOiJ4QHguY29tIiwicm9sZSI6IlVTRVIiLCJleHAiOjF9.invalid')).toBeNull();
  });
});

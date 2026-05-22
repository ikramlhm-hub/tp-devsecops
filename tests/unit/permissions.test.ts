import { describe, it, expect } from 'vitest';
import { canEditTicket, canDeleteTicket } from '@/lib/permissions';

describe('permissions — canEditTicket', () => {
  it('ADMIN peut modifier nimporte quel ticket', () => {
    expect(canEditTicket({ id: '1', role: 'ADMIN' }, { authorId: '99', status: 'OPEN' })).toBe(true);
  });

  it('AGENT peut modifier nimporte quel ticket', () => {
    expect(canEditTicket({ id: '2', role: 'AGENT' }, { authorId: '99', status: 'OPEN' })).toBe(true);
  });

  it('USER peut modifier son propre ticket', () => {
    expect(canEditTicket({ id: '3', role: 'USER' }, { authorId: '3', status: 'OPEN' })).toBe(true);
  });

  it('USER ne peut pas modifier le ticket dun autre', () => {
    expect(canEditTicket({ id: '3', role: 'USER' }, { authorId: '99', status: 'OPEN' })).toBe(false);
  });

  it('ADMIN peut supprimer un ticket', () => {
    expect(canDeleteTicket({ id: '1', role: 'ADMIN' })).toBe(true);
  });

  it('USER ne peut pas supprimer un ticket', () => {
    expect(canDeleteTicket({ id: '2', role: 'USER' })).toBe(false);
  });
});

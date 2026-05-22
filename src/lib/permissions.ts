export interface User {
  id: string;
  role: string;
}

export interface Ticket {
  authorId: string;
  status: string;
}

export function canEditTicket(user: User, ticket: Ticket): boolean {
  if (user.role === 'ADMIN') return true;
  if (user.role === 'AGENT') return true;
  if (user.role === 'USER' && ticket.authorId === user.id) return true;
  return false;
}

export function canDeleteTicket(user: User): boolean {
  return user.role === 'ADMIN';
}

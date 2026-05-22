'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

type Ticket = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string; email: string };
  assignee?: { id: string; name: string; email: string } | null;
  comments: Array<{ id: string; content: string; createdAt: string; author: { id: string; name: string } }>;
};

export default function TicketPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchTicket();
  }, [id]);

  async function fetchTicket() {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/tickets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTicket(data.ticket);
    } else if (res.status === 404 || res.status === 403) {
      router.push('/dashboard');
    }
    setLoading(false);
  }

  async function updateStatus(status: string) {
    const token = localStorage.getItem('token');
    await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    fetchTicket();
  }

  if (loading) return <main className="p-12 font-mono text-muted">Loading...</main>;
  if (!ticket || !user) return null;

  const canManage = user.role === 'AGENT' || user.role === 'ADMIN';

  return (
    <main className="min-h-screen">
      <header className="border-b border-ink/10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between font-mono text-sm">
          <Link href="/dashboard" className="hover:text-accent">← Back to dashboard</Link>
          <span className="text-muted">#{ticket.id.slice(-6)}</span>
        </div>
      </header>

      <article className="max-w-5xl mx-auto px-6 py-12">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className={`badge badge-${ticket.status.toLowerCase()}`}>
            {ticket.status.replace('_', ' ')}
          </span>
          <span className={`badge badge-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span>
        </div>

        <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tight leading-tight mb-6">
          {ticket.title}
        </h1>

        <div className="font-mono text-sm text-muted mb-10">
          Opened by <span className="text-ink">{ticket.author.name}</span> ·{' '}
          {new Date(ticket.createdAt).toLocaleString('fr-FR')}
          {ticket.assignee && (
            <> · Assigned to <span className="text-ink">{ticket.assignee.name}</span></>
          )}
        </div>

        <div className="border-l-4 border-ink pl-6 mb-12">
          <p className="font-body text-lg leading-relaxed whitespace-pre-wrap">
            {ticket.description}
          </p>
        </div>

        {/* Actions agent/admin */}
        {canManage && (
          <div className="border-2 border-ink p-6 mb-12">
            <p className="font-mono text-xs uppercase tracking-wider text-muted mb-4">Agent actions</p>
            <div className="flex flex-wrap gap-2">
              {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                <button
                  key={s}
                  onClick={() => updateStatus(s)}
                  disabled={ticket.status === s}
                  className={`badge cursor-pointer hover:scale-105 transition-transform ${
                    ticket.status === s ? 'bg-ink text-paper opacity-50 cursor-not-allowed' : ''
                  } badge-${s.toLowerCase()}`}
                >
                  → {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <section>
          <h2 className="font-display font-bold text-2xl mb-6 tracking-tight">
            Comments <span className="text-muted">({ticket.comments.length})</span>
          </h2>
          {ticket.comments.length === 0 ? (
            <p className="font-mono text-muted">No comments yet.</p>
          ) : (
            <ul className="space-y-6">
              {ticket.comments.map((c) => (
                <li key={c.id} className="border-l-2 border-accent pl-4">
                  <p className="font-mono text-xs text-muted mb-1">
                    {c.author.name} · {new Date(c.createdAt).toLocaleString('fr-FR')}
                  </p>
                  <p className="font-body whitespace-pre-wrap">{c.content}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </article>
    </main>
  );
}

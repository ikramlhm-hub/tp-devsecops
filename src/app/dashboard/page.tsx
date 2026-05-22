'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  _count: { comments: number };
};

type User = { id: string; email: string; name: string; role: string };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [showForm, setShowForm] = useState(false);
  const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'MEDIUM' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (!token || !storedUser) {
      router.push('/login');
      return;
    }
    setUser(JSON.parse(storedUser));
    fetchTickets();
  }, []);

  async function fetchTickets() {
    const token = localStorage.getItem('token');
    setLoading(true);
    const res = await fetch('/api/tickets', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setTickets(data.tickets);
    }
    setLoading(false);
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const res = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(newTicket),
    });
    if (res.ok) {
      setNewTicket({ title: '', description: '', priority: 'MEDIUM' });
      setShowForm(false);
      fetchTickets();
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  }

  const filtered = filter === 'ALL' ? tickets : tickets.filter((t) => t.status === filter);

  const stats = {
    OPEN: tickets.filter((t) => t.status === 'OPEN').length,
    IN_PROGRESS: tickets.filter((t) => t.status === 'IN_PROGRESS').length,
    RESOLVED: tickets.filter((t) => t.status === 'RESOLVED').length,
    CLOSED: tickets.filter((t) => t.status === 'CLOSED').length,
  };

  if (!user) return null;

  return (
    <main className="min-h-screen">
      {/* Top bar */}
      <header className="border-b border-ink/10 bg-paper sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-7 h-7 bg-ink rotate-12 flex items-center justify-center">
              <span className="text-paper font-display font-bold text-xs -rotate-12">H</span>
            </div>
            <span className="font-display font-bold tracking-tight">Helpdesk</span>
          </Link>
          <div className="flex items-center gap-6 font-mono text-sm">
            <span className="text-muted">
              {user.name} <span className="text-accent">/ {user.role}</span>
            </span>
            <button onClick={logout} className="text-ink hover:text-accent transition-colors">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Title */}
        <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted mb-2">Dashboard</p>
            <h1 className="font-display font-extrabold text-5xl tracking-tight">
              Your tickets.
            </h1>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary">
            {showForm ? '× Cancel' : '+ New ticket'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink/10 border border-ink/10 mb-12">
          {(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s === filter ? 'ALL' : s)}
              className={`bg-paper p-6 text-left transition-colors hover:bg-ink/5 ${
                filter === s ? 'bg-ink text-paper hover:bg-ink' : ''
              }`}
            >
              <p className="font-mono text-xs uppercase tracking-wider opacity-60">
                {s.replace('_', ' ')}
              </p>
              <p className="font-display font-extrabold text-4xl mt-2">{stats[s]}</p>
            </button>
          ))}
        </div>

        {/* New ticket form */}
        {showForm && (
          <form onSubmit={createTicket} className="border-2 border-ink p-8 mb-12 bg-paper">
            <h2 className="font-display font-bold text-2xl mb-6 tracking-tight">New ticket</h2>
            <div className="space-y-6">
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-muted">Title</label>
                <input
                  required
                  className="input"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
                  placeholder="Brief summary..."
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-muted">Description</label>
                <textarea
                  required
                  rows={4}
                  className="input resize-none"
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                  placeholder="Detail the issue..."
                />
              </div>
              <div>
                <label className="font-mono text-xs uppercase tracking-wider text-muted">Priority</label>
                <select
                  className="input"
                  value={newTicket.priority}
                  onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <button type="submit" className="btn-primary">Submit ticket →</button>
            </div>
          </form>
        )}

        {/* Tickets list */}
        {loading ? (
          <p className="font-mono text-muted">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="border-2 border-dashed border-ink/20 p-12 text-center">
            <p className="font-mono text-muted">No tickets {filter !== 'ALL' && `with status ${filter}`}.</p>
          </div>
        ) : (
          <ul className="divide-y divide-ink/10 border-t border-b border-ink/10">
            {filtered.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="block py-6 px-2 hover:bg-ink/5 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className={`badge badge-${t.status.toLowerCase()}`}>{t.status.replace('_', ' ')}</span>
                        <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                        <span className="font-mono text-xs text-muted">#{t.id.slice(-6)}</span>
                      </div>
                      <h3 className="font-display font-bold text-xl tracking-tight group-hover:text-accent transition-colors">
                        {t.title}
                      </h3>
                      <p className="text-sm text-ink/60 mt-1 line-clamp-1">{t.description}</p>
                      <p className="font-mono text-xs text-muted mt-2">
                        by {t.author.name}
                        {t.assignee && <> · assigned to {t.assignee.name}</>}
                        {t._count.comments > 0 && <> · {t._count.comments} comment{t._count.comments > 1 ? 's' : ''}</>}
                      </p>
                    </div>
                    <span className="font-display text-2xl text-muted group-hover:text-accent group-hover:translate-x-1 transition-all">
                      →
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

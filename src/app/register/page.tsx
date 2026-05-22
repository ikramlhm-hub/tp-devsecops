'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || data.issues?.[0]?.message || 'Erreur');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        <Link href="/" className="font-mono text-xs uppercase tracking-[0.3em] text-muted hover:text-accent">
          ← Back
        </Link>
        <h1 className="font-display font-extrabold text-5xl mt-8 mb-2 tracking-tight">
          Create your<br />account.
        </h1>
        <p className="text-ink/60 mb-10 font-body">Free for life. No credit card.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-muted">Full name</label>
            <input
              required
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Jane Doe"
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-muted">Email</label>
            <input
              type="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="jane@company.io"
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-muted">Password</label>
            <input
              type="password"
              required
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="8+ chars, 1 uppercase, 1 number"
            />
          </div>
          {error && <p className="text-red-600 font-mono text-sm">⚠ {error}</p>}
          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Creating...' : 'Create account →'}
          </button>
        </form>

        <p className="mt-8 text-sm text-muted font-mono">
          Already have an account?{' '}
          <Link href="/login" className="text-ink underline hover:text-accent">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

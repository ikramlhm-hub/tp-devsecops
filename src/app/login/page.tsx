'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur');
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/dashboard');
    } catch (err) {
      setError('Erreur réseau');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex">
      <div className="w-full md:w-1/2 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full">
          <Link href="/" className="font-mono text-xs uppercase tracking-[0.3em] text-muted hover:text-accent">
            ← Back
          </Link>
          <h1 className="font-display font-extrabold text-5xl mt-8 mb-2 tracking-tight">
            Welcome<br />back.
          </h1>
          <p className="text-ink/60 mb-10 font-body">Sign in to your support desk.</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-muted">Email</label>
              <input
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@helpdesk.io"
              />
            </div>
            <div>
              <label className="font-mono text-xs uppercase tracking-wider text-muted">Password</label>
              <input
                type="password"
                required
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <p className="text-red-600 font-mono text-sm">⚠ {error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50">
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <p className="mt-8 text-sm text-muted font-mono">
            No account?{' '}
            <Link href="/register" className="text-ink underline hover:text-accent">
              Create one
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden md:block w-1/2 bg-ink text-paper p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="relative h-full flex flex-col justify-between">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent">Helpdesk</p>
          <div>
            <p className="font-display text-3xl font-medium leading-tight">
              &ldquo;The best support tools<br />get out of the way.&rdquo;
            </p>
            <p className="mt-4 font-mono text-xs text-paper/50">— Anonymous SRE, 2024</p>
          </div>
        </div>
      </div>
    </main>
  );
}

import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-ink/10">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-ink rotate-12 flex items-center justify-center">
              <span className="text-paper font-display font-bold text-sm -rotate-12">H</span>
            </div>
            <span className="font-display font-bold tracking-tight text-xl">Helpdesk</span>
          </div>
          <nav className="flex gap-6 items-center font-mono text-sm">
            <Link href="/login" className="hover:text-accent transition-colors">Login</Link>
            <Link href="/register" className="btn-primary !py-2 !px-4 !text-sm">Get started →</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-20 lg:py-32">
        <div className="grid grid-cols-12 gap-6 items-end">
          <div className="col-span-12 lg:col-span-8">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted mb-6">
              v1.0 / Support platform
            </p>
            <h1 className="font-display font-extrabold text-6xl lg:text-8xl leading-[0.95] tracking-tight">
              Tickets,<br />
              <span className="italic font-medium">resolved</span>{' '}
              <span className="inline-block bg-accent text-paper px-3 -rotate-1">faster.</span>
            </h1>
          </div>
          <div className="col-span-12 lg:col-span-4 lg:pb-4">
            <p className="font-body text-lg text-ink/70 leading-relaxed">
              A minimal support desk for teams that prefer keyboards over kanbans.
              Open, assign, comment, close. That&rsquo;s it.
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/register" className="btn-primary">Open an account</Link>
              <Link href="/login" className="btn-secondary">Sign in</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="border-t border-ink/10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-ink/10">
          {[
            { n: '01', t: 'Role-based access', d: 'Users open tickets. Agents triage. Admins manage everything.' },
            { n: '02', t: 'REST API first', d: 'Every action exposed as a clean JSON endpoint, JWT-authenticated.' },
            { n: '03', t: 'Built to scale', d: 'Containerized, instrumented, ready for load tests and CI/CD.' },
          ].map(f => (
            <div key={f.n} className="p-8 lg:p-12">
              <p className="font-mono text-sm text-accent mb-4">— {f.n}</p>
              <h3 className="font-display font-bold text-2xl mb-3 tracking-tight">{f.t}</h3>
              <p className="text-ink/60 leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Demo accounts */}
      <section className="border-t border-ink/10 bg-ink text-paper">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-paper/50 mb-4">
            Demo credentials
          </p>
          <h2 className="font-display font-bold text-4xl mb-8 tracking-tight">
            Try it now — no setup.
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { role: 'ADMIN', email: 'admin@helpdesk.io' },
              { role: 'AGENT', email: 'agent@helpdesk.io' },
              { role: 'USER', email: 'user@helpdesk.io' },
            ].map(a => (
              <div key={a.role} className="border border-paper/20 p-6">
                <p className="font-mono text-xs text-accent mb-2">{a.role}</p>
                <p className="font-mono text-sm">{a.email}</p>
                <p className="font-mono text-sm text-paper/60">Password123!</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10">
        <div className="max-w-7xl mx-auto px-6 py-8 flex justify-between items-center font-mono text-xs text-muted">
          <span>© {new Date().getFullYear()} Helpdesk · Next.js + Prisma</span>
          <Link href="/api/health" className="hover:text-accent">/api/health</Link>
        </div>
      </footer>
    </main>
  );
}

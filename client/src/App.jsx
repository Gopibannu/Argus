import React, { useState, useEffect } from 'react';
import { Shield, Lock, Key, CheckCircle, AlertCircle, RefreshCw, UserCheck, LogOut, Terminal, ExternalLink, ShieldAlert, Cpu } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [health, setHealth] = useState(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Fetch current session & health on mount
  useEffect(() => {
    fetchSession();
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  async function fetchHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      setHealth({ status: 'offline', database: 'disconnected' });
    }
  }

  async function fetchSession() {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setCurrentUser(data.user);
          setCsrfToken(data.csrfToken);
        } else {
          setCurrentUser(null);
          setCsrfToken(null);
        }
      }
    } catch (err) {
      console.error('Session fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogin(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }

      setCurrentUser(data.user);
      setCsrfToken(data.csrfToken);
      setPassword('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });
      setCurrentUser(null);
      setCsrfToken(null);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  async function handleLogoutAll() {
    try {
      await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });
      setCurrentUser(null);
      setCsrfToken(null);
    } catch (err) {
      console.error('Logout all failed:', err);
    }
  }

  const quickRoles = [
    { label: 'Admin (Alice)', email: 'admin@argus.local', role: 'admin' },
    { label: 'Owner (Bob - Eng)', email: 'owner1@argus.local', role: 'owner' },
    { label: 'Owner (Carol - Fin)', email: 'owner2@argus.local', role: 'owner' },
    { label: 'Viewer (Dave - Audit)', email: 'viewer1@argus.local', role: 'viewer' },
    { label: 'Disabled (Dan - Lockout)', email: 'disabled@argus.local', role: 'disabled' },
  ];

  function fillRole(r) {
    setEmail(r.email);
    setPassword('Password@Argus2026!');
    setErrorMsg('');
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)', padding: '0.65rem', borderRadius: '0.75rem', display: 'flex' }}>
            <Shield size={28} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em' }}>ARGUS</h1>
              <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', border: '1px solid rgba(56, 189, 248, 0.3)', fontWeight: 600 }}>v1.0-SECURITY</span>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Audit • Revoke • Grant • Unified Security</p>
          </div>
        </div>

        {/* Health status & GitHub */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {health && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', borderRadius: '9999px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: health.status === 'healthy' ? '#10b981' : '#f43f5e' }} className={health.status === 'healthy' ? 'pulse-emerald' : ''} />
              <span style={{ color: 'var(--text-muted)' }}>PostgreSQL:</span>
              <span style={{ color: health.status === 'healthy' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{health.database}</span>
              <span style={{ color: 'var(--text-dim)' }}>|</span>
              <span style={{ color: 'var(--text-muted)' }}>Uptime: {health.uptimeSeconds}s</span>
            </div>
          )}
          <a
            href="https://github.com/Gopibannu/Argus.git"
            target="_blank"
            rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem', padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-subtle)' }}
          >
            <span>GitHub</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw className="pulse-emerald" size={32} style={{ margin: '0 auto 1rem auto' }} />
          <p>Verifying secure session in database...</p>
        </div>
      ) : currentUser ? (
        /* Authenticated Session Dashboard */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                  <UserCheck size={24} color="#10b981" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>{currentUser.fullName}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{currentUser.email}</p>
                </div>
              </div>
              <span style={{
                padding: '0.25rem 0.65rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                background: currentUser.role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : currentUser.role === 'owner' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: currentUser.role === 'admin' ? '#f87171' : currentUser.role === 'owner' ? '#38bdf8' : '#34d399',
                border: '1px solid currentColor'
              }}>
                {currentUser.role}
              </span>
            </div>

            <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>User ID:</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>{currentUser.id.substring(0, 18)}...</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-dim)' }}>Department:</span>
                <span style={{ color: 'var(--text-muted)' }}>{currentUser.department}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-dim)' }}>Session Choke Point:</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>Active (Verified on DB)</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button onClick={handleLogout} className="btn-danger" style={{ flex: 1 }}>
                <LogOut size={16} style={{ marginRight: '0.5rem' }} />
                Logout
              </button>
              <button onClick={handleLogoutAll} className="btn-danger" style={{ flex: 1, borderColor: '#f59e0b', color: '#fcd34d', background: 'rgba(245, 158, 11, 0.1)' }}>
                <ShieldAlert size={16} style={{ marginRight: '0.5rem' }} />
                Log Out Everywhere
              </button>
            </div>
          </div>

          {/* Session Security Inspector */}
          <div className="glass-panel" style={{ padding: '1.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <Cpu size={20} color="#38bdf8" />
              <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Security Engine State</h3>
            </div>

            <ul style={{ listStyle: 'none', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} color="#10b981" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <div>
                  <strong>Server-Side Opaque Session:</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Token stored hashed (SHA-256) in PostgreSQL. No client token tampering possible.</p>
                </div>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} color="#10b981" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <div>
                  <strong>HttpOnly; Secure; SameSite=Strict:</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Cookie cannot be read by JavaScript (immune to XSS session theft) and never sent cross-origin.</p>
                </div>
              </li>
              <li style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <CheckCircle size={16} color="#10b981" style={{ marginTop: '0.15rem', flexShrink: 0 }} />
                <div>
                  <strong>Live Revocation Guarantee:</strong>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No stateless JWT delay. Terminating session or deactivating account takes effect immediately.</p>
                </div>
              </li>
            </ul>
          </div>
        </div>
      ) : (
        /* Login Form */
        <div style={{ maxWidth: '480px', margin: '2rem auto 0 auto' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', marginBottom: '0.75rem' }}>
                <Lock size={28} color="#38bdf8" />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Secure Authentication</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Server-side sessions with live database authorization
              </p>
            </div>

            {/* Quick-fill roles for hackathon evaluation */}
            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
                Judge Quick-Fill (One-Click Role Selection):
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {quickRoles.map(r => (
                  <button
                    key={r.email}
                    type="button"
                    className="role-pill"
                    onClick={() => fillRole(r)}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  className="input-field"
                  placeholder="admin@argus.local"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  className="input-field"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary"
                style={{ width: '100%', marginTop: '0.5rem' }}
              >
                {submitting ? 'Verifying Credentials...' : 'Authenticate'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Principles Footer */}
      <footer style={{ marginTop: '4rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
        <div>
          <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>1. Single Choke Point</strong>
          Every document request passes through <code className="font-mono">authorize()</code>. No inline bypasses.
        </div>
        <div>
          <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>2. Instant Revocation</strong>
          Live PostgreSQL grant verification on every request. Stale JWTs forbidden.
        </div>
        <div>
          <strong style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '0.25rem' }}>3. Tamper-Evident Audit</strong>
          Cryptographic hash chain with database-level immutability triggers.
        </div>
      </footer>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  Shield, Lock, Key, CheckCircle, AlertCircle, RefreshCw, UserCheck, 
  LogOut, Terminal, ExternalLink, ShieldAlert, Cpu, UploadCloud, 
  FileText, Download, Users, Trash2, Search, Filter, Clock, Eye, AlertTriangle,
  Activity, ShieldCheck, Database, ToggleLeft, ToggleRight, Sparkles
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [health, setHealth] = useState(null);

  // Auth Form State (Login & Sign Up)
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [regRole, setRegRole] = useState('viewer'); // 'viewer' | 'owner'

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Engineering');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Grants Modal & AI Suggestions State
  const [selectedDocForGrants, setSelectedDocForGrants] = useState(null);
  const [docGrants, setDocGrants] = useState([]);
  const [grantEmail, setGrantEmail] = useState('');
  const [grantPermission, setGrantPermission] = useState('read');
  const [granting, setGranting] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);
  const [loadingAi, setLoadingAi] = useState(false);

  // Ticket State
  const [activeTicket, setActiveTicket] = useState(null);

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'admin'

  // Admin Dashboard State
  const [adminMetrics, setAdminMetrics] = useState(null);
  const [auditChainStatus, setAuditChainStatus] = useState(null);
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState('');
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [adminUsers, setAdminUsers] = useState([]);
  const [loadingAdminData, setLoadingAdminData] = useState(false);

  useEffect(() => {
    fetchSession();
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'documents') {
        fetchDocuments();
      } else if (activeTab === 'admin' && currentUser.role === 'admin') {
        fetchAdminDashboardData();
      }
    }
  }, [currentUser, searchQuery, selectedCategory, activeTab, auditOutcomeFilter, auditActionFilter]);

  async function fetchHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (_) {
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

  async function fetchDocuments() {
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append('q', searchQuery.trim());
      if (selectedCategory.trim()) params.append('category', selectedCategory.trim());

      const res = await fetch(`/api/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Fetch documents error:', err);
    }
  }

  async function fetchAdminDashboardData() {
    setLoadingAdminData(true);
    try {
      // 1. Fetch metrics
      const metricsRes = await fetch('/api/admin/metrics');
      if (metricsRes.ok) {
        const m = await metricsRes.json();
        setAdminMetrics(m);
      }

      // 2. Fetch audit trail with active filters
      const auditParams = new URLSearchParams();
      auditParams.append('limit', '50');
      if (auditOutcomeFilter) auditParams.append('outcome', auditOutcomeFilter);
      if (auditActionFilter) auditParams.append('action', auditActionFilter);

      const auditRes = await fetch(`/api/admin/audit?${auditParams.toString()}`);
      if (auditRes.ok) {
        const a = await auditRes.json();
        setAuditLogs(a.auditTrail || []);
      }

      // 3. Fetch user accounts
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const u = await usersRes.json();
        setAdminUsers(u.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoadingAdminData(false);
    }
  }

  async function verifyAuditChain() {
    setVerifyingChain(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch('/api/admin/audit/verify');
      const data = await res.json();
      setAuditChainStatus(data);
      if (data.valid) {
        setSuccessMsg(`Cryptographic Hash Chain Verified: All ${data.totalRowsVerified} historical entries match sequential SHA-256 links.`);
      } else {
        setErrorMsg(`TAMPER DETECTED: ${data.error || 'Audit chain integrity compromised!'}`);
      }
    } catch (err) {
      setErrorMsg(`Audit verification failed: ${err.message}`);
    } finally {
      setVerifyingChain(false);
    }
  }

  async function toggleUserStatus(userId, currentStatus, userName) {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle account status.');

      setSuccessMsg(`User "${userName}" ${data.isActive ? 'activated' : 'deactivated (all active sessions terminated immediately)'}.`);
      fetchAdminDashboardData();
    } catch (err) {
      setErrorMsg(err.message);
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
      if (!res.ok) throw new Error(data.error || 'Authentication failed.');

      setCurrentUser(data.user);
      setCsrfToken(data.csrfToken);
      setPassword('');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRegister(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          fullName,
          department,
          role: regRole
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed.');

      setCurrentUser(data.user);
      setCsrfToken(data.csrfToken);
      setPassword('');
      setSuccessMsg(`Welcome to Argus, ${data.user.fullName}! Account created with role: ${data.user.role}.`);
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
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' }
      });
      setCurrentUser(null);
      setCsrfToken(null);
      setDocuments([]);
    } catch (err) {
      console.error('Logout failed:', err);
    }
  }

  async function handleLogoutAll() {
    try {
      await fetch('/api/auth/logout-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' }
      });
      setCurrentUser(null);
      setCsrfToken(null);
      setDocuments([]);
    } catch (err) {
      console.error('Logout all failed:', err);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    setUploading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (uploadTitle.trim()) formData.append('title', uploadTitle.trim());
      formData.append('category', uploadCategory);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken || '' },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload rejected.');

      setSuccessMsg(`Document "${data.document.title}" uploaded & encrypted with AES-256-GCM.`);
      setSelectedFile(null);
      setUploadTitle('');
      fetchDocuments();
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(docId, filename) {
    try {
      const res = await fetch(`/api/documents/${docId}/download`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Download denied by authorization choke point.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || 'document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleGenerateTicket(docId) {
    try {
      const res = await fetch(`/api/documents/${docId}/ticket`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate ticket.');

      setActiveTicket({
        ticket: data.ticket,
        url: `${window.location.origin}/api/documents/tickets/${data.ticket}`,
        expiresAt: data.expiresAt
      });
      setSuccessMsg('Single-use 60-second download ticket issued.');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function openGrantsModal(doc) {
    setSelectedDocForGrants(doc);
    setErrorMsg('');
    setSuccessMsg('');
    setAiSuggestions(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/grants`);
      if (res.ok) {
        const data = await res.json();
        setDocGrants(data.grants || []);
      }
    } catch (err) {
      console.error('Grants fetch error:', err);
    }
  }

  async function fetchAiSuggestions(docId) {
    setLoadingAi(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/documents/${docId}/ai-suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch AI suggestions.');
      setAiSuggestions(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingAi(false);
    }
  }

  async function handleCreateGrant(e) {
    e.preventDefault();
    if (!selectedDocForGrants || !grantEmail) return;

    setGranting(true);
    setErrorMsg('');

    try {
      const res = await fetch(`/api/documents/${selectedDocForGrants.id}/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' },
        body: JSON.stringify({ granteeEmail: grantEmail, permission: grantPermission })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Grant failed.');

      setSuccessMsg(data.message);
      setGrantEmail('');
      openGrantsModal(selectedDocForGrants);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setGranting(false);
    }
  }

  async function handleRevokeGrant(grantId) {
    if (!selectedDocForGrants) return;
    try {
      const res = await fetch(`/api/documents/${selectedDocForGrants.id}/grants/${grantId}/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Revocation failed.');

      setSuccessMsg('Access revoked immediately. All issued download tickets invalidated.');
      openGrantsModal(selectedDocForGrants);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleDeleteDocument(docId) {
    if (!window.confirm('Are you sure you want to soft-delete this document? Immediate revocation will apply to all grantees.')) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken || '' }
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Deletion failed.');

      setSuccessMsg('Document soft-deleted. Access permanently closed.');
      fetchDocuments();
    } catch (err) {
      setErrorMsg(err.message);
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
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Top Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
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

        {/* Health status & User controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {health && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.85rem', borderRadius: '9999px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: health.status === 'healthy' ? '#10b981' : '#f43f5e' }} className={health.status === 'healthy' ? 'pulse-emerald' : ''} />
              <span style={{ color: 'var(--text-muted)' }}>DB:</span>
              <span style={{ color: health.status === 'healthy' ? '#10b981' : '#f43f5e', fontWeight: 600 }}>{health.database}</span>
              <span style={{ color: 'var(--text-dim)' }}>|</span>
              <span style={{ color: 'var(--text-muted)' }}>Choke: Active</span>
            </div>
          )}

          {currentUser && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
                <UserCheck size={16} color="#38bdf8" />
                <span>{currentUser.fullName}</span>
                <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 700 }}>
                  {currentUser.role}
                </span>
              </div>
              <button onClick={handleLogout} className="btn-danger" style={{ padding: '0.35rem 0.65rem' }} title="Log Out">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Alert Messages */}
      {errorMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(244, 63, 94, 0.12)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', color: '#6ee7b7', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
          <CheckCircle size={18} style={{ flexShrink: 0 }} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main App Body */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-muted)' }}>
          <RefreshCw className="pulse-emerald" size={32} style={{ margin: '0 auto 1rem auto' }} />
          <p>Verifying secure session in database...</p>
        </div>
      ) : !currentUser ? (
        /* Login & Sign Up Form */
        <div style={{ maxWidth: '480px', margin: '2rem auto 0 auto' }}>
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'inline-flex', padding: '0.75rem', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.1)', marginBottom: '0.75rem' }}>
                <Lock size={28} color="#38bdf8" />
              </div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                {authMode === 'login' ? 'Secure Authentication' : 'Create Argus Account'}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                {authMode === 'login' 
                  ? 'Server-side sessions with live database authorization' 
                  : 'Self-provision as Document Owner or Compliance Viewer'}
              </p>
            </div>

            {/* Auth Mode Toggle Tabs (Login vs Sign Up) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: 'rgba(0, 0, 0, 0.3)', padding: '0.25rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
              <button
                type="button"
                onClick={() => { setAuthMode('login'); setErrorMsg(''); }}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.35rem',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: authMode === 'login' ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
                  color: authMode === 'login' ? '#38bdf8' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                style={{
                  padding: '0.5rem',
                  borderRadius: '0.35rem',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: authMode === 'signup' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                  color: authMode === 'signup' ? '#34d399' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >
                Sign Up
              </button>
            </div>

            {authMode === 'login' ? (
              /* Log In View */
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700, marginBottom: '0.5rem' }}>
                    Judge Quick-Fill (One-Click Role Selection):
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {quickRoles.map(r => (
                      <button key={r.email} type="button" className="role-pill" onClick={() => fillRole(r)}>
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Email Address</label>
                    <input type="email" required className="input-field" placeholder="admin@argus.local" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Password</label>
                    <input type="password" required className="input-field" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                    {submitting ? 'Verifying Credentials...' : 'Authenticate'}
                  </button>
                </form>
              </div>
            ) : (
              /* Sign Up View */
              <div>
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Full Name</label>
                    <input type="text" required className="input-field" placeholder="Dr. Jane Smith" value={fullName} onChange={e => setFullName(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Work Email</label>
                    <input type="email" required className="input-field" placeholder="jane@company.com" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Password (Min 8 Characters)</label>
                    <input type="password" required minLength={8} className="input-field" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Role</label>
                      <select className="input-field" value={regRole} onChange={e => setRegRole(e.target.value)}>
                        <option value="owner">Document Owner</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--text-muted)' }}>Department</label>
                      <select className="input-field" value={department} onChange={e => setDepartment(e.target.value)}>
                        <option value="Engineering">Engineering</option>
                        <option value="Finance">Finance</option>
                        <option value="Legal">Legal</option>
                        <option value="Compliance">Compliance</option>
                        <option value="Research">Research</option>
                      </select>
                    </div>
                  </div>
                  <button type="submit" disabled={submitting} className="btn-primary" style={{ width: '100%', marginTop: '0.5rem', background: 'linear-gradient(135deg, #059669, #10b981)' }}>
                    {submitting ? 'Creating Secure Account...' : 'Register & Log In'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Authenticated Workspace */
        <div>
          {/* Navigation Bar / Role Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.75rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setActiveTab('documents')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.5rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  background: activeTab === 'documents' ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                  color: activeTab === 'documents' ? '#38bdf8' : 'var(--text-muted)',
                  borderBottom: activeTab === 'documents' ? '2px solid #38bdf8' : '2px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <FileText size={16} />
                <span>Documents & Access</span>
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setActiveTab('admin')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    padding: '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: 'none',
                    background: activeTab === 'admin' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: activeTab === 'admin' ? '#34d399' : 'var(--text-muted)',
                    borderBottom: activeTab === 'admin' ? '2px solid #10b981' : '2px solid transparent',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <ShieldCheck size={16} />
                  <span>Admin Security Center</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700 }}>
                    VERIFY CHAIN
                  </span>
                </button>
              )}
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Session ID: <code className="font-mono">{currentUser.id.slice(0, 8)}...</code> | Strict RBAC
            </div>
          </div>

          {activeTab === 'documents' ? (
            /* Documents Workspace View */
            <div>
              {/* Top Control Bar: Upload & Security Inspector */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            {/* Upload Zone (For Owners) */}
            <div className="glass-panel" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <UploadCloud size={20} color="#38bdf8" />
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Upload & Envelope Encrypt</h3>
              </div>

              <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Document Title (optional)"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                  />
                  <select
                    className="input-field"
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value)}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Legal">Legal</option>
                    <option value="Compliance">Compliance</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div style={{ border: '2px dashed var(--border-subtle)', borderRadius: '0.5rem', padding: '1rem', textAlign: 'center', background: 'rgba(0, 0, 0, 0.2)' }}>
                  <input
                    type="file"
                    id="docFile"
                    style={{ display: 'none' }}
                    onChange={e => setSelectedFile(e.target.files[0])}
                  />
                  <label htmlFor="docFile" style={{ cursor: 'pointer', display: 'block' }}>
                    <FileText size={28} color={selectedFile ? '#10b981' : '#64748b'} style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{selectedFile ? selectedFile.name : 'Choose File or Drag Here'}</p>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                      Allowed: PDF, DOCX, XLSX, PNG, JPG, TXT (Max 10MB)
                    </p>
                  </label>
                </div>

                <button type="submit" disabled={uploading || !selectedFile} className="btn-primary" style={{ padding: '0.6rem 1rem' }}>
                  {uploading ? 'Validating Magic Bytes & Encrypting...' : 'Upload & Encrypt (AES-256-GCM)'}
                </button>
              </form>
            </div>

            {/* Choke Point Status & Session Info */}
            <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <Cpu size={20} color="#10b981" />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Security Policies</h3>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div>🛡️ <strong>Single Choke Point:</strong> Every read, download, edit, or grant runs live through <code className="font-mono">authorize()</code>.</div>
                  <div>⚡ <strong>Immediate Revocation:</strong> Zero cached authorization. Grants and sessions re-checked on Postgres in real time.</div>
                  <div>🔒 <strong>Anti-IDOR:</strong> Unauthorized document IDs return <strong>404 Not Found</strong> to eliminate existence enumeration.</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={handleLogoutAll} className="btn-danger" style={{ flex: 1, borderColor: '#f59e0b', color: '#fcd34d', background: 'rgba(245, 158, 11, 0.1)', fontSize: '0.8rem' }}>
                  <ShieldAlert size={14} style={{ marginRight: '0.35rem' }} />
                  Log Out Everywhere
                </button>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '240px' }}>
              <Search size={18} color="var(--text-dim)" />
              <input
                type="text"
                className="input-field"
                placeholder="Search documents by title or filename (SQL-filtered)..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '0.5rem 0.75rem' }}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={18} color="var(--text-dim)" />
              <select
                className="input-field"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', minWidth: '150px' }}
              >
                <option value="">All Categories</option>
                <option value="Engineering">Engineering</option>
                <option value="Finance">Finance</option>
                <option value="Legal">Legal</option>
                <option value="Compliance">Compliance</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Accessible Documents ({documents.length})</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Filtered inside PostgreSQL query</span>
            </div>

            {documents.length === 0 ? (
              <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-dim)' }}>
                <FileText size={36} style={{ margin: '0 auto 0.75rem auto', opacity: 0.4 }} />
                <p>No documents found matching your authorized grants.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                      <th style={{ padding: '0.75rem 1.25rem' }}>Document</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Owner</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Your Rights</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Size</th>
                      <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map(doc => (
                      <tr key={doc.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '0.85rem 1.25rem' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{doc.title}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{doc.originalFilename}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.75rem' }}>
                            {doc.category}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div>{doc.owner.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{doc.owner.email}</div>
                        </td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <span style={{
                            padding: '0.2rem 0.55rem',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: doc.permission === 'owner' ? 'rgba(56, 189, 248, 0.15)' : doc.permission === 'edit' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: doc.permission === 'owner' ? '#38bdf8' : doc.permission === 'edit' ? '#fcd34d' : '#34d399',
                            border: '1px solid currentColor'
                          }}>
                            {doc.permission}
                          </span>
                        </td>
                        <td style={{ padding: '0.85rem 1rem', color: 'var(--text-dim)' }}>
                          {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                        </td>
                        <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                            {/* Download Button */}
                            <button
                              onClick={() => handleDownload(doc.id, doc.originalFilename)}
                              className="btn-primary"
                              style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
                              title="Download & Decrypt"
                            >
                              <Download size={14} style={{ marginRight: '0.25rem' }} />
                              Download
                            </button>

                            {/* 60s Ticket Button */}
                            <button
                              onClick={() => handleGenerateTicket(doc.id)}
                              className="role-pill"
                              style={{ fontSize: '0.75rem' }}
                              title="Generate 60s Single-Use Ticket"
                            >
                              <Clock size={14} style={{ marginRight: '0.25rem' }} />
                              Ticket (60s)
                            </button>

                            {/* Manage Grants (Owner Only) */}
                            {doc.permission === 'owner' && (
                              <button
                                onClick={() => openGrantsModal(doc)}
                                className="role-pill"
                                style={{ fontSize: '0.75rem', borderColor: '#38bdf8', color: '#38bdf8' }}
                                title="Manage Named Grants"
                              >
                                <Users size={14} style={{ marginRight: '0.25rem' }} />
                                Grants
                              </button>
                            )}

                            {/* Soft Delete (Owner Only) */}
                            {doc.permission === 'owner' && (
                              <button
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="btn-danger"
                                style={{ padding: '0.4rem 0.6rem' }}
                                title="Soft Delete Document"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Active Ticket Banner */}
          {activeTicket && (
            <div className="glass-panel" style={{ padding: '1.25rem', marginTop: '1.5rem', background: 'rgba(2, 132, 199, 0.1)', borderColor: 'rgba(56, 189, 248, 0.4)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={18} color="#38bdf8" />
                  <strong>Active Download Ticket (Expires in 60s)</strong>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Invalidates immediately if access is revoked</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  readOnly
                  value={activeTicket.url}
                  className="input-field font-mono"
                  style={{ fontSize: '0.8rem', background: 'rgba(0, 0, 0, 0.4)' }}
                />
                <a
                  href={activeTicket.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                >
                  Test Ticket
                </a>
              </div>
            </div>
          )}

            </div>
          ) : (
            /* Admin Security Center View (Alice Admin Only) */
            <div>
              {/* Verification & Metrics Top Bar */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                {/* 1. Live Hash Chain Integrity Card */}
                <div className="glass-panel" style={{ padding: '1.5rem', borderLeft: auditChainStatus?.valid === false ? '4px solid #f43f5e' : '4px solid #10b981' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Audit Chain Integrity
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: auditChainStatus?.valid === false ? '#f43f5e' : '#34d399' }}>
                        {auditChainStatus ? (auditChainStatus.valid ? 'VALID & INTACT' : 'COMPROMISED') : (adminMetrics?.chainIntegrity || 'VERIFIED')}
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: auditChainStatus?.valid === false ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)' }}>
                      <ShieldCheck size={24} color={auditChainStatus?.valid === false ? '#f43f5e' : '#10b981'} />
                    </div>
                  </div>

                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                    O(N) sequential SHA-256 hash verification linking each row to its predecessor back to Genesis block.
                  </p>

                  <button
                    onClick={verifyAuditChain}
                    disabled={verifyingChain}
                    className="btn-primary"
                    style={{ width: '100%', fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                  >
                    {verifyingChain ? 'Recalculating SHA-256 Hashes...' : 'Verify Audit Chain Now'}
                  </button>
                </div>

                {/* 2. Total Events & Denied Attempts Card */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Audit Security Counters
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, marginTop: '0.25rem', color: 'var(--text-main)' }}>
                        {adminMetrics?.totalEvents ?? 0} Events Recorded
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(56, 189, 248, 0.15)' }}>
                      <Activity size={24} color="#38bdf8" />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                    <div style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'rgba(244, 63, 94, 0.1)', color: '#fda4af' }}>
                      <strong>{adminMetrics?.deniedEvents ?? 0}</strong> Denied (403/404)
                    </div>
                    <div style={{ padding: '0.4rem 0.6rem', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#fcd34d' }}>
                      <strong>{adminMetrics?.permissionChanges ?? 0}</strong> Grants/Revokes
                    </div>
                  </div>
                </div>

                {/* 3. Database Security Trigger Status */}
                <div className="glass-panel" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>
                        PostgreSQL Immutability
                      </div>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '0.25rem', color: '#10b981' }}>
                        ACTIVE TRIGGER
                      </div>
                    </div>
                    <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(16, 185, 129, 0.15)' }}>
                      <Database size={24} color="#10b981" />
                    </div>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <code className="font-mono">trg_protect_audit_log</code> rejects any <code className="font-mono">UPDATE</code>, <code className="font-mono">DELETE</code>, or <code className="font-mono">TRUNCATE</code>, even by database superusers.
                  </p>
                </div>
              </div>

              {/* User Accounts Management & Instant Session Death */}
              <div className="glass-panel" style={{ marginBottom: '2rem', overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>User Accounts & Immediate Lockout</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Deactivating a user instantly terminates all active database sessions across all devices.
                    </p>
                  </div>
                  <button onClick={fetchAdminDashboardData} className="role-pill" style={{ padding: '0.35rem 0.75rem' }}>
                    <RefreshCw size={14} style={{ marginRight: '0.25rem' }} /> Refresh
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                        <th style={{ padding: '0.75rem 1.25rem' }}>User / Department</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Email</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                        <th style={{ padding: '0.75rem 1.25rem', textAlign: 'right' }}>Lockout Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(u => (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.85rem 1.25rem' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.fullName}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{u.department}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>{u.email}</td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 700 }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              padding: '0.2rem 0.5rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: u.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              color: u.isActive ? '#34d399' : '#fda4af'
                            }}>
                              {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>
                            {u.id !== currentUser.id && (
                              <button
                                onClick={() => toggleUserStatus(u.id, u.isActive, u.fullName)}
                                className={u.isActive ? 'btn-danger' : 'btn-primary'}
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}
                              >
                                {u.isActive ? 'Deactivate (Kill Sessions)' : 'Activate User'}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cryptographic Audit Trail Stream */}
              <div className="glass-panel" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Tamper-Evident Audit Trail Stream</h3>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      Every event recorded with sequential <code className="font-mono">prev_hash</code> and <code className="font-mono">row_hash</code>
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      className="input-field"
                      value={auditOutcomeFilter}
                      onChange={e => setAuditOutcomeFilter(e.target.value)}
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', minWidth: '130px' }}
                    >
                      <option value="">All Outcomes</option>
                      <option value="allowed">Allowed Only</option>
                      <option value="denied">Denied Only</option>
                    </select>

                    <select
                      className="input-field"
                      value={auditActionFilter}
                      onChange={e => setAuditActionFilter(e.target.value)}
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', minWidth: '130px' }}
                    >
                      <option value="">All Actions</option>
                      <option value="login">Logins</option>
                      <option value="download">Downloads</option>
                      <option value="upload">Uploads</option>
                      <option value="grant">Grants</option>
                      <option value="revoke">Revocations</option>
                    </select>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0, 0, 0, 0.2)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)' }}>
                        <th style={{ padding: '0.75rem 1rem' }}>Seq #</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Timestamp</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Actor</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Action</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Outcome</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Reason / Target</th>
                        <th style={{ padding: '0.75rem 1rem' }}>Row Hash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map(log => (
                        <tr key={log.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'JetBrains Mono', color: 'var(--text-dim)' }}>
                            #{log.sequenceId}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap', color: 'var(--text-muted)' }}>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 600 }}>{log.actor.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{log.actor.ip}</div>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{ padding: '0.15rem 0.4rem', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.05)', textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 600 }}>
                              {log.action}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={{
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              background: log.outcome === 'allowed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              color: log.outcome === 'allowed' ? '#34d399' : '#fda4af'
                            }}>
                              {log.outcome}
                            </span>
                          </td>
                          <td style={{ padding: '0.75rem 1rem', color: 'var(--text-muted)' }}>
                            {log.reason || (log.document?.title ? `Doc: ${log.document.title}` : log.targetUser?.name ? `User: ${log.targetUser.name}` : '-')}
                          </td>
                          <td style={{ padding: '0.75rem 1rem', fontFamily: 'JetBrains Mono', fontSize: '0.7rem', color: '#38bdf8' }}>
                            {log.rowHash ? `${log.rowHash.slice(0, 12)}...` : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Grants Management Modal */}
          {selectedDocForGrants && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
              <div className="glass-panel" style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Manage Grants</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{selectedDocForGrants.title}</p>
                  </div>
                  <button onClick={() => setSelectedDocForGrants(null)} className="role-pill" style={{ padding: '0.25rem 0.6rem' }}>✕ Close</button>
                </div>

                {/* AI Access Assistant Section (Gemini 1.5 Flash / Human-in-the-loop) */}
                <div style={{ marginBottom: '1.5rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '0.75rem', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Sparkles size={18} color="#818cf8" />
                      <strong style={{ fontSize: '0.9rem', color: '#c7d2fe' }}>Gemini AI Access Assistant</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchAiSuggestions(selectedDocForGrants.id)}
                      disabled={loadingAi}
                      className="btn-primary"
                      style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }}
                    >
                      {loadingAi ? 'Consulting Gemini...' : 'Suggest Recipients (AI)'}
                    </button>
                  </div>

                  <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.75rem' }}>
                    Recommends vetted recipients based on document category and organization roles. <em>AI suggestions are purely advisory—a human owner must confirm every grant. Both suggestion and decision are written to the audit chain.</em>
                  </p>

                  {aiSuggestions && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ fontSize: '0.7rem', color: '#818cf8', fontWeight: 600 }}>
                        Engine: {aiSuggestions.model}
                      </div>
                      {aiSuggestions.suggestions.length === 0 ? (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{aiSuggestions.disclaimer}</p>
                      ) : (
                        aiSuggestions.suggestions.map(s => (
                          <div key={s.userId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0, 0, 0, 0.3)', padding: '0.5rem 0.75rem', borderRadius: '0.4rem', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                            <div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.fullName} ({s.email})</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                                {s.department} • Recommended: <span style={{ textTransform: 'uppercase', color: '#38bdf8' }}>{s.permission}</span> • <em>{s.reason}</em>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setGrantEmail(s.email);
                                setGrantPermission(s.permission);
                              }}
                              className="role-pill"
                              style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.4)' }}
                            >
                              Apply to Form
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Grant New Person Form */}
                <form onSubmit={handleCreateGrant} style={{ marginBottom: '1.75rem', background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: '0.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Grant Access to Named Person:</h4>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <input
                      type="email"
                      required
                      placeholder="viewer1@argus.local"
                      className="input-field"
                      style={{ flex: 1, minWidth: '200px' }}
                      value={grantEmail}
                      onChange={e => setGrantEmail(e.target.value)}
                    />
                    <select
                      className="input-field"
                      style={{ width: '100px' }}
                      value={grantPermission}
                      onChange={e => setGrantPermission(e.target.value)}
                    >
                      <option value="read">Read</option>
                      <option value="edit">Edit</option>
                    </select>
                    <button type="submit" disabled={granting} className="btn-primary" style={{ padding: '0.5rem 1rem' }}>
                      {granting ? 'Granting...' : 'Grant Access'}
                    </button>
                  </div>
                </form>

                {/* Current Grants List */}
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem' }}>Active & Historical Grants:</h4>
                  {docGrants.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>No external grants issued yet. Only you (the owner) can access this document.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {docGrants.map(g => (
                        <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-subtle)', opacity: g.revoked ? 0.5 : 1 }}>
                          <div>
                            <div style={{ fontWeight: 600 }}>{g.grantee.name} ({g.grantee.email})</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              Permission: <span style={{ textTransform: 'uppercase', color: '#38bdf8' }}>{g.permission}</span> | {g.revoked ? 'REVOKED' : 'ACTIVE'}
                            </div>
                          </div>

                          {!g.revoked ? (
                            <button onClick={() => handleRevokeGrant(g.id)} className="btn-danger" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }}>
                              Revoke Now
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: '#fda4af' }}>Revoked</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
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

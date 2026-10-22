import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import Navbar from './components/Navbar';
import HeroSection from './components/HeroSection';
import AuthModal from './components/AuthModal';
import DocumentsView from './components/DocumentsView';
import AdminSecurityCenter from './components/AdminSecurityCenter';
import ThreatDefenseView from './components/ThreatDefenseView';
import GrantsModal from './components/GrantsModal';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [health, setHealth] = useState(null);

  // Auth Modal State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [regRole, setRegRole] = useState('viewer'); // 'viewer' | 'owner'
  const [otpStep, setOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [demoOtp, setDemoOtp] = useState('');

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

  // Active Navigation Tab: 'documents' | 'admin' | 'architecture'
  const [activeTab, setActiveTab] = useState('documents');

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
  }, [currentUser, activeTab, searchQuery, selectedCategory, auditOutcomeFilter, auditActionFilter]);

  async function fetchSession() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          setCsrfToken(data.csrfToken);
        } else {
          setCurrentUser(null);
        }
      }
    } catch (err) {
      console.error('Session verification error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (_) {}
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
      const metricsRes = await fetch('/api/admin/metrics');
      if (metricsRes.ok) {
        const m = await metricsRes.json();
        setAdminMetrics(m);
      }

      const auditParams = new URLSearchParams();
      auditParams.append('limit', '50');
      if (auditOutcomeFilter) auditParams.append('outcome', auditOutcomeFilter);
      if (auditActionFilter) auditParams.append('action', auditActionFilter);

      const auditRes = await fetch(`/api/admin/audit?${auditParams.toString()}`);
      if (auditRes.ok) {
        const a = await auditRes.json();
        setAuditLogs(a.auditTrail || []);
      }

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

  async function handleVerifyChain() {
    setVerifyingChain(true);
    try {
      const res = await fetch('/api/admin/audit/verify');
      const data = await res.json();
      setAuditChainStatus(data);
    } catch (err) {
      setAuditChainStatus({ valid: false, error: err.message });
    } finally {
      setVerifyingChain(false);
    }
  }

  async function toggleUserStatus(targetUserId, currentStatus, userName) {
    try {
      const res = await fetch(`/api/admin/users/${targetUserId}/toggle-status`, {
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

  function openAuthModal(mode = 'login') {
    setAuthMode(mode);
    setOtpStep(false);
    setErrorMsg('');
    setIsAuthModalOpen(true);
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
      setIsAuthModalOpen(false);
      setSuccessMsg(`Authenticated as ${data.user.fullName} (${data.user.role.toUpperCase()}).`);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleInitiateRegister(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/initiate-register', {
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

      setPendingEmail(data.email || email);
      setDemoOtp(data.demoOtp || '');
      setOtpStep(true);
      setSuccessMsg(data.message || 'Verification code sent to your email.');
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(e) {
    if (e) e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/auth/verify-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: pendingEmail || email,
          otp: otpCode.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed.');

      setCurrentUser(data.user);
      setCsrfToken(data.csrfToken);
      setPassword('');
      setOtpStep(false);
      setOtpCode('');
      setIsAuthModalOpen(false);
      setSuccessMsg(`Email verified! Welcome to Argus, ${data.user.fullName}!`);
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
      setDocuments([]);
      setAdminMetrics(null);
      setAuditLogs([]);
      setActiveTab('documents');
      setSuccessMsg('Signed out of vault.');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  async function handleLogoutAll() {
    if (!window.confirm('Terminate ALL your sessions across every device immediately?')) return;
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
      setSuccessMsg('All active sessions invalidated from PostgreSQL.');
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile) return;

    setErrorMsg('');
    setSuccessMsg('');
    setUploading(true);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('title', uploadTitle || selectedFile.name);
    formData.append('category', uploadCategory);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrfToken || '' },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');

      setSuccessMsg(`Document "${data.document.title}" encrypted with unique AES-256-GCM DEK and saved.`);
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
    setErrorMsg('');
    try {
      const res = await fetch(`/api/documents/${docId}/download`);
      if (res.status === 404) {
        throw new Error('ANTI-IDOR VERIFIED: Document not found (404). Access denied without information leakage.');
      }
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Download failed.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      setSuccessMsg(`Ciphertext fetched and successfully decrypted.`);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function handleGenerateTicket(docId) {
    setErrorMsg('');
    try {
      const res = await fetch(`/api/documents/${docId}/ticket`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });

      if (res.status === 404) {
        throw new Error('ANTI-IDOR VERIFIED: Document not found (404). Ticket refused.');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ticket creation failed.');

      setActiveTicket(data);
      setSuccessMsg(`Issued single-use download ticket. Valid for 60 seconds.`);
    } catch (err) {
      setErrorMsg(err.message);
    }
  }

  async function openGrantsModal(doc) {
    setSelectedDocForGrants(doc);
    setGrantEmail('');
    setAiSuggestions(null);
    try {
      const res = await fetch(`/api/documents/${doc.id}/grants`);
      if (res.ok) {
        const data = await res.json();
        setDocGrants(data.grants || []);
      }
    } catch (err) {
      console.error('Failed to load grants:', err);
    }
  }

  async function handleFetchAiSuggestions() {
    if (!selectedDocForGrants) return;
    setLoadingAi(true);
    try {
      const res = await fetch(`/api/documents/${selectedDocForGrants.id}/ai-recipients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI assistance failed.');
      setAiSuggestions(data);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoadingAi(false);
    }
  }

  async function handleGrantPermission(e) {
    e.preventDefault();
    if (!selectedDocForGrants || !grantEmail) return;

    setGranting(true);
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
    openAuthModal('login');
  }

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-sky-200">
      
      {/* 1. Global Sticky Enterprise Navbar at the Top */}
      <Navbar
        currentUser={currentUser}
        health={health}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        onOpenAuthModal={openAuthModal}
      />

      {/* 2. Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        
        {/* Global Floating Alerts */}
        {errorMsg && (
          <div className="mb-8 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between gap-3 shadow-lg shadow-rose-950/30">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg('')} className="text-slate-400 hover:text-white text-xs cursor-pointer font-semibold">Dismiss</button>
          </div>
        )}

        {successMsg && (
          <div className="mb-8 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-lg shadow-emerald-950/30">
            <div className="flex items-center gap-2.5">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium">{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white text-xs cursor-pointer font-semibold">Dismiss</button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="text-center py-32 text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 text-sky-400 animate-spin" />
            <p className="text-sm font-semibold">Verifying secure database session...</p>
          </div>
        ) : !currentUser ? (
          /* Unauthenticated Landing View (Clean, without in-page login form) */
          <div>
            <HeroSection 
              onSelectRole={fillRole} 
              quickRoles={quickRoles} 
              onOpenAuthModal={openAuthModal}
            />
          </div>
        ) : (
          /* Authenticated Workspace */
          <div>
            {activeTab === 'documents' && (
              <DocumentsView
                currentUser={currentUser}
                documents={documents}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                uploadTitle={uploadTitle}
                setUploadTitle={setUploadTitle}
                uploadCategory={uploadCategory}
                setUploadCategory={setUploadCategory}
                selectedFile={selectedFile}
                setSelectedFile={setSelectedFile}
                uploading={uploading}
                activeTicket={activeTicket}
                onUpload={handleUpload}
                onDownload={handleDownload}
                onGenerateTicket={handleGenerateTicket}
                onOpenGrantsModal={openGrantsModal}
                onDeleteDocument={handleDeleteDocument}
                onLogoutAll={handleLogoutAll}
              />
            )}

            {activeTab === 'admin' && currentUser.role === 'admin' && (
              <AdminSecurityCenter
                currentUser={currentUser}
                adminMetrics={adminMetrics}
                auditChainStatus={auditChainStatus}
                verifyingChain={verifyingChain}
                auditLogs={auditLogs}
                auditOutcomeFilter={auditOutcomeFilter}
                setAuditOutcomeFilter={setAuditOutcomeFilter}
                auditActionFilter={auditActionFilter}
                setAuditActionFilter={setAuditActionFilter}
                adminUsers={adminUsers}
                loadingAdminData={loadingAdminData}
                onVerifyChain={handleVerifyChain}
                onToggleUserStatus={toggleUserStatus}
                onRefreshData={fetchAdminDashboardData}
              />
            )}

            {activeTab === 'architecture' && (
              <ThreatDefenseView />
            )}
          </div>
        )}

      </main>

      {/* Interactive Pop-Up Auth Modal (Sign In / Register / OTP) */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        fullName={fullName}
        setFullName={setFullName}
        department={department}
        setDepartment={setDepartment}
        regRole={regRole}
        setRegRole={setRegRole}
        otpStep={otpStep}
        setOtpStep={setOtpStep}
        otpCode={otpCode}
        setOtpCode={setOtpCode}
        pendingEmail={pendingEmail}
        demoOtp={demoOtp}
        submitting={submitting}
        onLogin={handleLogin}
        onInitiateRegister={handleInitiateRegister}
        onVerifyOtp={handleVerifyOtp}
      />

      {/* Grants & AI Modal */}
      <GrantsModal
        selectedDoc={selectedDocForGrants}
        docGrants={docGrants}
        grantEmail={grantEmail}
        setGrantEmail={setGrantEmail}
        grantPermission={grantPermission}
        setGrantPermission={setGrantPermission}
        granting={granting}
        aiSuggestions={aiSuggestions}
        loadingAi={loadingAi}
        onClose={() => setSelectedDocForGrants(null)}
        onGrant={handleGrantPermission}
        onRevoke={handleRevokeGrant}
        onFetchAiSuggestions={handleFetchAiSuggestions}
      />

      {/* Production Footer */}
      <footer className="mt-auto border-t border-white/[0.08] bg-[#060913]/90 px-4 sm:px-6 lg:px-8 py-8 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white font-mono tracking-wider">ARGUS</span>
            <span className="text-slate-500">•</span>
            <span>Snovasys Fresher Challenge 2026</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 text-slate-500 font-mono text-[11px]">
            <span>Anti-IDOR: Enforced</span>
            <span>•</span>
            <span>Envelope AES-256-GCM: Locked</span>
            <span>•</span>
            <span>SHA-256 Hash Chain: Active</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

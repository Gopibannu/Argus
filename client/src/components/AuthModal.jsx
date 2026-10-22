import React from 'react';
import { 
  Lock, Mail, ArrowLeft, Key, 
  CheckCircle2, Sparkles, User, ShieldCheck, X
} from 'lucide-react';

export default function AuthModal({
  isOpen,
  onClose,
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  fullName,
  setFullName,
  department,
  setDepartment,
  regRole,
  setRegRole,
  otpStep,
  setOtpStep,
  otpCode,
  setOtpCode,
  pendingEmail,
  demoOtp,
  submitting,
  onLogin,
  onInitiateRegister,
  onVerifyOtp
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="glass-panel w-full max-w-md border border-white/20 shadow-2xl p-6 sm:p-8 relative overflow-hidden rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        
        {/* Ambient Top Glow */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-sky-500/15 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 mb-2.5 text-sky-400 shadow-sm">
            {otpStep ? <Mail className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-sky-400" />}
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            {otpStep 
              ? 'Verify Email Address' 
              : authMode === 'login' 
                ? 'Sign In to Vault' 
                : 'Create Argus Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {otpStep 
              ? `Verification code dispatched to ${pendingEmail}`
              : authMode === 'login' 
                ? 'Stateful session with real-time PostgreSQL authorization' 
                : 'Choose your role: Document Owner or Compliance Viewer'}
          </p>
        </div>

        {/* Auth Mode Toggle (Only when not in OTP step) */}
        {!otpStep && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-950/80 border border-white/10 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                authMode === 'login' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                authMode === 'signup' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Register (with OTP)
            </button>
          </div>
        )}

        {/* Mode 1: Login Form */}
        {authMode === 'login' && !otpStep && (
          <form onSubmit={onLogin} className="space-y-4">
            {/* Quick Demo Predefined Accounts for Hackathon Judges */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-sky-500/20 text-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-[11px] text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                  Predefined Accounts (1-Click Fill)
                </span>
                <span className="text-[10px] text-slate-500 font-mono">Password@Argus2026!</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@argus.local');
                    setPassword('Password@Argus2026!');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer ${
                    email === 'admin@argus.local'
                      ? 'bg-purple-500/20 text-purple-200 border-purple-500/50 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                  }`}
                >
                  <div className="font-bold text-[11px] text-purple-300">Alice Admin</div>
                  <div className="text-[10px] text-slate-400 truncate">admin@argus.local</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('owner1@argus.local');
                    setPassword('Password@Argus2026!');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer ${
                    email === 'owner1@argus.local'
                      ? 'bg-sky-500/20 text-sky-200 border-sky-500/50 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                  }`}
                >
                  <div className="font-bold text-[11px] text-sky-300">Bob Owner (Eng)</div>
                  <div className="text-[10px] text-slate-400 truncate">owner1@argus.local</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('viewer1@argus.local');
                    setPassword('Password@Argus2026!');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer ${
                    email === 'viewer1@argus.local'
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                  }`}
                >
                  <div className="font-bold text-[11px] text-emerald-300">Dave Viewer (Audit)</div>
                  <div className="text-[10px] text-slate-400 truncate">viewer1@argus.local</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('owner2@argus.local');
                    setPassword('Password@Argus2026!');
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-left border transition-all cursor-pointer ${
                    email === 'owner2@argus.local'
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/50 shadow-sm'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/5'
                  }`}
                >
                  <div className="font-bold text-[11px] text-amber-300">Carol Owner (Fin)</div>
                  <div className="text-[10px] text-slate-400 truncate">owner2@argus.local</div>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Work Email</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="user@argus.local"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Master Password</label>
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
              className="btn-primary w-full mt-2"
            >
              {submitting ? 'Verifying Credentials...' : 'Authenticate & Enter Vault'}
            </button>
          </form>
        )}

        {/* Mode 2: Register Form */}
        {authMode === 'signup' && !otpStep && (
          <form onSubmit={onInitiateRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="input-field"
                placeholder="Dr. Eleanor Vance"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
              <input
                type="email"
                required
                className="input-field"
                placeholder="eleanor@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Password (Min 8 Characters)</label>
              <input
                type="password"
                required
                minLength={8}
                className="input-field"
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Platform Role</label>
                <select 
                  className="input-field"
                  value={regRole} 
                  onChange={e => setRegRole(e.target.value)}
                >
                  <option value="owner">Document Owner</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                <select 
                  className="input-field"
                  value={department} 
                  onChange={e => setDepartment(e.target.value)}
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Finance">Finance</option>
                  <option value="Legal">Legal</option>
                  <option value="Compliance">Compliance</option>
                  <option value="Research">Research</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary w-full mt-2 !bg-gradient-to-r !from-emerald-600 !to-teal-600 shadow-emerald-900/30"
            >
              <Mail className="w-4 h-4" />
              <span>{submitting ? 'Dispatching Verification...' : 'Send Verification OTP'}</span>
            </button>
          </form>
        )}

        {/* Mode 3: OTP Verification */}
        {otpStep && (
          <div className="space-y-4">
            {demoOtp && (
              <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-400/30 text-center">
                <p className="text-[11px] text-slate-400 mb-1 font-semibold">
                  🔑 <strong>Test Mode / Console Output Captured:</strong>
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-xl font-mono font-extrabold text-sky-400 tracking-widest">{demoOtp}</code>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtp)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 font-semibold cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={onVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-2 text-center">
                  Enter 6-Digit Numeric Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  className="input-field font-mono font-extrabold text-center text-3xl tracking-[0.4em] text-emerald-400 py-3"
                  placeholder="123456"
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || otpCode.length < 6}
                className="btn-primary w-full !bg-gradient-to-r !from-emerald-600 !to-teal-600"
              >
                {submitting ? 'Verifying OTP...' : 'Confirm Code & Enter Vault'}
              </button>

              <div className="flex items-center justify-between pt-2 text-xs">
                <button
                  type="button"
                  onClick={() => { setOtpStep(false); setOtpCode(''); }}
                  className="text-slate-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Signup</span>
                </button>

                <button
                  type="button"
                  onClick={onInitiateRegister}
                  disabled={submitting}
                  className="text-sky-400 hover:text-sky-300 font-semibold cursor-pointer"
                >
                  Resend Code
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );
}

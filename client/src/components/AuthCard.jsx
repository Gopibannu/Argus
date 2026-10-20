import React from 'react';
import { 
  Lock, Mail, ArrowLeft, Key, 
  CheckCircle2, Sparkles, User, ShieldCheck
} from 'lucide-react';

export default function AuthCard({
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
  return (
    <div className="max-w-md mx-auto">
      <div className="glass-panel p-8 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
        
        {/* Glow decoration */}
        <div className="absolute -top-16 -right-16 w-32 h-32 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Icon & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 mb-3 text-sky-400">
            {otpStep ? <Mail className="w-6 h-6 text-emerald-400" /> : <Lock className="w-6 h-6 text-sky-400" />}
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {otpStep 
              ? 'Verify Email Address' 
              : authMode === 'login' 
                ? 'Sign In to Vault' 
                : 'Create Argus Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {otpStep 
              ? `Verification code dispatched to ${pendingEmail}`
              : authMode === 'login' 
                ? 'Stateful session with real-time PostgreSQL authorization' 
                : 'Choose your role: Document Owner or Compliance Viewer'}
          </p>
        </div>

        {/* Mode Switcher Tabs (Only if not in OTP step) */}
        {!otpStep && (
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950/70 border border-white/10 mb-6 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className={`py-2 rounded-lg transition-all ${
                authMode === 'login' 
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('signup')}
              className={`py-2 rounded-lg transition-all ${
                authMode === 'signup' 
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign Up (with OTP)
            </button>
          </div>
        )}

        {/* View 1: Login Form */}
        {authMode === 'login' && !otpStep && (
          <form onSubmit={onLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Master Password</label>
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

        {/* View 2: Sign Up Step 1 */}
        {authMode === 'signup' && !otpStep && (
          <form onSubmit={onInitiateRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Full Name</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Work Email</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password (Min 8 Characters)</label>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Platform Role</label>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">Department</label>
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

        {/* View 3: Sign Up Step 2 (OTP Verification) */}
        {otpStep && (
          <div className="space-y-4">
            {/* Auto-Fill Banner for Demo / Offline Mode */}
            {demoOtp && (
              <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-400/30 text-center">
                <p className="text-[11px] text-slate-400 mb-1 font-semibold">
                  🔑 <strong>Test Mode / Console Output Captured:</strong>
                </p>
                <div className="flex items-center justify-center gap-2">
                  <code className="text-lg font-mono font-extrabold text-sky-400 tracking-widest">{demoOtp}</code>
                  <button
                    type="button"
                    onClick={() => setOtpCode(demoOtp)}
                    className="text-[11px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 font-semibold cursor-pointer"
                  >
                    Auto-Fill
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={onVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                  Enter 6-Digit Numeric Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  className="input-field font-mono font-bold text-center text-2xl tracking-[0.5em] text-emerald-400"
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
                  className="text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
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

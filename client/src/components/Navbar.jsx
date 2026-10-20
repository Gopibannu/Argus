import React from 'react';
import { 
  Shield, UserCheck, LogOut, Terminal, 
  FileText, ShieldCheck, Activity, Key, BookOpen
} from 'lucide-react';

export default function Navbar({ 
  currentUser, 
  health, 
  activeTab, 
  setActiveTab, 
  onLogout,
  onOpenDocModal
}) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#070a12]/80 border-b border-white/10 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand & Mission Tag */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => currentUser ? setActiveTab('documents') : null}>
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 shadow-lg shadow-sky-500/25 border border-sky-400/30">
            <Shield className="w-5 h-5 text-white" />
            <div className="absolute inset-0 rounded-xl bg-sky-400/20 blur-sm pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-white font-mono">ARGUS</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 tracking-wider">
                ENTERPRISE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Audit • Revoke • Grant • Unified Security
            </p>
          </div>
        </div>

        {/* Global Navigation Tabs (When Logged In) */}
        {currentUser && (
          <nav className="flex items-center gap-1.5 bg-slate-900/60 p-1 rounded-xl border border-white/5 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'documents'
                  ? 'bg-gradient-to-r from-sky-500/20 to-indigo-500/20 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Documents Vault</span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'admin'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Security Center</span>
                <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/30 text-emerald-300 font-mono font-bold">
                  CHAIN OK
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'architecture'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Threat Defense</span>
            </button>
          </nav>
        )}

        {/* Right Status Indicators & User Badge */}
        <div className="flex items-center gap-3">
          {/* Live Node & DB Health Pill */}
          {health && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 text-xs font-mono text-slate-300 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-emerald-400 pulse-emerald' : 'bg-rose-500'}`} />
              <span className="text-slate-400">PostgreSQL:</span>
              <span className={health.status === 'healthy' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                {health.database}
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Choke:</span>
              <span className="text-sky-400 font-semibold">Active</span>
            </div>
          )}

          {/* User Profile Badge & Logout */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10">
              <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs">
                <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-sky-500/30 to-indigo-500/30 flex items-center justify-center text-sky-300 font-bold font-mono">
                  {currentUser.fullName.charAt(0)}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-slate-200 truncate max-w-[120px]">{currentUser.fullName}</div>
                  <div className="text-[10px] text-sky-400 uppercase font-mono font-bold tracking-wider">{currentUser.role}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-all"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 hidden sm:inline">Zero-Trust Enterprise Cloud</span>
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v1.0-PROD
              </span>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

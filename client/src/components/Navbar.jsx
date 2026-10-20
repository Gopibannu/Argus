import React from 'react';
import { 
  Shield, LogOut, FileText, ShieldCheck, 
  BookOpen, Terminal, Sparkles
} from 'lucide-react';

export default function Navbar({ 
  currentUser, 
  health, 
  activeTab, 
  setActiveTab, 
  onLogout 
}) {
  return (
    <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#060913]/85 border-b border-white/[0.08] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Brand Identity */}
        <div 
          className="flex items-center gap-3 cursor-pointer select-none group" 
          onClick={() => currentUser && setActiveTab('documents')}
        >
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 shadow-md shadow-sky-500/20 border border-sky-400/30 group-hover:scale-105 transition-transform">
            <Shield className="w-5 h-5 text-white" />
            <div className="absolute inset-0 rounded-xl bg-sky-400/20 blur-sm pointer-events-none" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white font-mono">ARGUS</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 tracking-wider">
                VAULT
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Zero-Trust Document Sharing
            </p>
          </div>
        </div>

        {/* Center: Primary Navigation Tabs (When Authenticated) */}
        {currentUser && (
          <nav className="flex items-center gap-1 p-1 rounded-xl bg-slate-900/70 border border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('documents')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'documents'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Documents</span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'admin'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Security Center</span>
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  CHAIN OK
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-purple-400" />
              <span>Threat Defense</span>
            </button>
          </nav>
        )}

        {/* Right: Live Database Node Health & User Profile */}
        <div className="flex items-center gap-3">
          {/* Live Node Pill */}
          {health && (
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-white/10 text-xs font-mono text-slate-300">
              <span className={`w-2 h-2 rounded-full ${health.status === 'healthy' ? 'bg-emerald-400 pulse-emerald' : 'bg-rose-500'}`} />
              <span className="text-slate-400">PostgreSQL:</span>
              <span className={health.status === 'healthy' ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                Connected
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">Anti-IDOR:</span>
              <span className="text-sky-400 font-semibold">Active</span>
            </div>
          )}

          {/* Authenticated User Menu */}
          {currentUser ? (
            <div className="flex items-center gap-2.5 pl-3 border-l border-white/10">
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white font-bold font-mono text-xs">
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-slate-100 truncate max-w-[130px] leading-tight">
                    {currentUser.fullName}
                  </div>
                  <div className="text-[10px] text-sky-400 uppercase font-mono font-bold tracking-wider">
                    {currentUser.role}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={onLogout}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition-all cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a 
                href="#auth-card" 
                className="btn-primary !py-1.5 !px-3.5 !text-xs"
              >
                Sign In
              </a>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}

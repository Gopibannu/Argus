import React from 'react';
import { 
  Shield, Lock, Binary, Zap, FileCheck, Key, 
  Terminal, ShieldAlert, CheckCircle2, ArrowRight
} from 'lucide-react';

export default function HeroSection({ onSelectRole, quickRoles }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 p-8 sm:p-12 mb-10 shadow-2xl shadow-sky-950/50">
      
      {/* Background glow orb */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        
        {/* Top Challenge Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-400 text-xs font-bold uppercase tracking-wider mb-6 shadow-sm">
          <Shield className="w-3.5 h-3.5 text-sky-400" />
          <span>Snovasys Fresher Hiring Challenge 2026 • Enterprise Defense</span>
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Zero-Trust Document Sharing with a <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
            Cryptographic Audit Vault
          </span>
        </h1>

        {/* Hero Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed font-normal">
          The wrong person can never read a file, and you can mathematically prove who did. Engineered with single choke point authorization, AES-256-GCM envelope encryption, tamper-evident hash chains, and instant multi-device revocation.
        </p>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left mb-10">
          
          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 hover:border-sky-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center gap-2.5 mb-2 text-sky-400">
              <Lock className="w-4 h-4" />
              <span className="font-bold text-sm text-white">Anti-IDOR Core</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ungranted document requests return uniform <strong>404 Not Found</strong>. Zero existence leaks.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 hover:border-emerald-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center gap-2.5 mb-2 text-emerald-400">
              <Binary className="w-4 h-4" />
              <span className="font-bold text-sm text-white">SHA-256 Hash Chain</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Append-only audit trail anchored in PostgreSQL. Database triggers reject any modification.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 hover:border-purple-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center gap-2.5 mb-2 text-purple-400">
              <Zap className="w-4 h-4" />
              <span className="font-bold text-sm text-white">Instant Revocation</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero cached JWTs. Stateful database sessions + per-document versioning kill tickets in 0ms.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-white/10 hover:border-amber-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center gap-2.5 mb-2 text-amber-400">
              <Key className="w-4 h-4" />
              <span className="font-bold text-sm text-white">Envelope Encryption</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unique per-file DEK with AES-256-GCM. Cloud storage only holds raw encrypted ciphertext.
            </p>
          </div>

        </div>

        {/* Quick Role Tester Bar */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-sky-500/30 max-w-2xl mx-auto shadow-inner">
          <div className="flex items-center justify-between gap-2 mb-2.5 text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-1.5 text-sky-400">
              <Terminal className="w-3.5 h-3.5" />
              <span>JUDGE DEMO: One-Click Persona Auto-Fill</span>
            </span>
            <span className="text-[11px] text-slate-500">Click to fill login form below</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickRoles.map(r => (
              <button
                key={r.email}
                type="button"
                onClick={() => onSelectRole(r)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/10 hover:border-sky-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

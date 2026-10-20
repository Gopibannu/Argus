import React from 'react';
import { 
  Shield, Lock, Binary, Zap, Key, 
  Terminal, Sparkles, CheckCircle2, ArrowRight,
  UserCheck, ShieldAlert
} from 'lucide-react';

export default function HeroSection({ onSelectRole, quickRoles, onOpenAuthModal }) {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-b from-slate-900/90 via-[#0a0f1d] to-[#060913] p-8 sm:p-14 mb-12 shadow-2xl shadow-sky-950/40">
      
      {/* Ambient background glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-4xl mx-auto text-center">
        
        {/* Challenge badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-sky-500/10 border border-sky-400/30 text-sky-300 text-xs font-semibold mb-6 shadow-sm">
          <Shield className="w-4 h-4 text-sky-400 shrink-0" />
          <span>Snovasys Fresher Hiring Challenge 2026 • Enterprise Defense</span>
        </div>

        {/* Main Title */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Zero-Trust Document Sharing with a <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Cryptographic Audit Vault
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mb-8 leading-relaxed font-normal">
          The wrong person can never read a file, and you can mathematically prove who did. Engineered with single choke-point authorization, envelope AES-256-GCM encryption, tamper-evident hash chains, and instant multi-device revocation.
        </p>

        {/* Call to action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
          <button
            type="button"
            onClick={() => onOpenAuthModal('login')}
            className="btn-primary !py-3 !px-7 text-sm font-bold flex items-center gap-2 shadow-sky-950/50 cursor-pointer"
          >
            <span>Launch Security Vault</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => onOpenAuthModal('signup')}
            className="btn-secondary !py-3 !px-6 text-sm font-semibold cursor-pointer"
          >
            <span>Create Free Account</span>
          </button>
        </div>

        {/* 4 Core Pillars Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left mb-10">
          
          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-sky-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-sky-400">
              <Lock className="w-4 h-4 shrink-0" />
              <span className="font-bold text-sm text-white">Anti-IDOR Core</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Ungranted document requests return uniform <strong>404 Not Found</strong>. Zero existence leaks.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-emerald-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-emerald-400">
              <Binary className="w-4 h-4 shrink-0" />
              <span className="font-bold text-sm text-white">SHA-256 Chain</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Append-only audit trail anchored in PostgreSQL. Database triggers reject any modification.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-purple-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-purple-400">
              <Zap className="w-4 h-4 shrink-0" />
              <span className="font-bold text-sm text-white">Instant Revoke</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Zero cached JWTs. Stateful database sessions + per-document versioning kill tickets in 0ms.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-amber-500/40 transition-all backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2 text-amber-400">
              <Key className="w-4 h-4 shrink-0" />
              <span className="font-bold text-sm text-white">Envelope Crypto</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unique per-file DEK with AES-256-GCM. Cloud storage only holds raw encrypted ciphertext.
            </p>
          </div>

        </div>

        {/* Demo Fast-Fill Roles Bar */}
        <div className="p-5 rounded-2xl bg-slate-950/80 border border-sky-500/25 max-w-2xl mx-auto shadow-inner">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3 text-xs text-slate-400 font-semibold">
            <span className="flex items-center gap-2 text-sky-400">
              <Terminal className="w-4 h-4" />
              <span>JUDGE DEMO: One-Click Persona Auto-Fill</span>
            </span>
            <span className="text-[11px] text-slate-500">Opens sign in popup with credentials pre-filled</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {quickRoles.map(r => (
              <button
                key={r.email}
                type="button"
                onClick={() => onSelectRole(r)}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-white/10 hover:border-sky-500/40 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                <span>{r.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>

    </section>
  );
}

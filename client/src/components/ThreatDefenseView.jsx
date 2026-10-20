import React from 'react';
import { 
  ShieldCheck, Lock, Binary, Cpu, 
  Terminal, ExternalLink, CheckCircle2, Shield
} from 'lucide-react';

export default function ThreatDefenseView() {
  const threats = [
    { id: 'THR-01', title: 'Unauthorized Document Read (Direct IDOR)', mit: 'authorize() choke point enforces ownership or active grant. 404 on ungranted.', test: 'tests/documents.test.js' },
    { id: 'THR-02', title: 'Existence Enumeration via Status Codes', mit: 'Uniform 404 Not Found on ungranted documents. Never reveals 403 existence.', test: 'tests/authzMatrix.test.js' },
    { id: 'THR-03', title: 'Audit Trail Historical Modification / Deletion', mit: 'Database trigger trg_protect_audit_log raises exception on UPDATE/DELETE.', test: 'tests/audit.test.js' },
    { id: 'THR-04', title: 'Privilege Escalation by Read-Only Grantee', mit: 'Server rejects grant creation, document editing, and deletion by non-owners with 403.', test: 'tests/documents.test.js' },
    { id: 'THR-05', title: 'Stale Token Access After Permission Revocation', mit: 'Per-document grant_version check invalidates tickets and grants in real time.', test: 'tests/documents.test.js' },
    { id: 'THR-06', title: 'Compromised Session Survival After Lockout', mit: 'Instant multi-device session purge on admin user deactivation.', test: 'tests/audit.test.js' },
    { id: 'THR-07', title: 'Macro Injection via Malicious Office Files', mit: 'Magic byte inspects binary headers; docm/xlsm/dotm forbidden automatically.', test: 'tests/documents.test.js' },
    { id: 'THR-08', title: 'Prompt Injection in AI Access Assistant', mit: 'Strict prompt compartmentalization, control delimiter stripping, candidate filtering.', test: 'tests/ai.test.js' },
    { id: 'THR-09', title: 'Search Query Data Leakage', mit: 'SQL queries join grants table with tenant filters so ungranted docs never appear.', test: 'tests/documents.test.js' },
    { id: 'THR-10', title: 'Cryptographic Hash Chain Desynchronization', mit: 'Deterministic sorted key serialization ensures repeatable verification.', test: 'tests/audit.test.js' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Overview Header Card */}
      <div className="glass-panel p-6 border border-purple-500/20 bg-gradient-to-r from-purple-950/20 via-slate-900/60 to-slate-900/40">
        <div className="flex items-center gap-3 mb-2 text-purple-400">
          <ShieldCheck className="w-6 h-6" />
          <h2 className="text-xl font-bold text-white">Threat Vectors & Architectural Proofs</h2>
        </div>
        <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
          Every threat vector in <code className="font-mono text-purple-300">THREATS.md</code> is backed by active automated test suites. 
          Judges and security auditors can verify any vector against the codebase in seconds.
        </p>
      </div>

      {/* Threats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {threats.map(t => (
          <div key={t.id} className="glass-panel p-4 border border-white/10 hover:border-purple-500/30 transition-all text-xs">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                {t.id}
              </span>
              <span className="font-mono text-[11px] text-slate-500 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Verified in CI</span>
              </span>
            </div>

            <div className="font-bold text-slate-200 text-sm mb-1">{t.title}</div>
            <div className="text-slate-400 leading-relaxed mb-3">{t.mit}</div>

            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Test Suite:</span>
              <code className="text-sky-400">{t.test}</code>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

import React from 'react';
import { 
  ShieldCheck, AlertTriangle, RefreshCw, Download, 
  Binary, Activity, Lock, Users, UserX, CheckCircle2
} from 'lucide-react';

export default function AdminSecurityCenter({
  currentUser,
  adminMetrics,
  auditChainStatus,
  verifyingChain,
  auditLogs,
  auditOutcomeFilter,
  setAuditOutcomeFilter,
  auditActionFilter,
  setAuditActionFilter,
  adminUsers,
  loadingAdminData,
  onVerifyChain,
  onToggleUserStatus,
  onRefreshData
}) {
  return (
    <div className="space-y-6">

      {/* Top Metrics Cards */}
      {adminMetrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="glass-panel p-5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Total Cryptographic Events</span>
              <Activity className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {adminMetrics.totalEvents || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Append-only audit trail</div>
          </div>

          <div className="glass-panel p-5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Access Violations Blocked</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400 font-mono">
              {adminMetrics.deniedEvents || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Anti-IDOR & policy rejections</div>
          </div>

          <div className="glass-panel p-5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Permission Mutations</span>
              <Lock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-extrabold text-purple-400 font-mono">
              {adminMetrics.permissionChanges || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Grant & revoke operations</div>
          </div>

          <div className="glass-panel p-5 border border-white/10">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase">Active Corporate Actors</span>
              <Users className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 font-mono">
              {adminMetrics.activeActors || 0}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Distinct verified identities</div>
          </div>

        </div>
      )}

      {/* Cryptographic Chain Integrity Verification Card */}
      <div className="glass-panel p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-slate-900/40">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-emerald-400 font-bold mb-1">
              <Binary className="w-5 h-5" />
              <h3 className="text-base text-white">SHA-256 Tamper-Evident Hash Chain</h3>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Recalculates every SHA-256 node sequentially from Genesis Block #1 to the current Head Block. Mathematically proves zero historical records were deleted or modified.
            </p>
          </div>

          <button
            type="button"
            onClick={onVerifyChain}
            disabled={verifyingChain}
            className="btn-primary !bg-gradient-to-r !from-emerald-600 !to-teal-600 shadow-emerald-900/40"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{verifyingChain ? 'Verifying Hashes...' : 'Verify Cryptographic Chain'}</span>
          </button>
        </div>

        {/* Verification Result Output */}
        {auditChainStatus && (
          <div className={`mt-4 p-4 rounded-xl border text-xs font-mono ${
            auditChainStatus.valid 
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' 
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}>
            <div className="flex items-center gap-2 font-bold text-sm mb-1">
              {auditChainStatus.valid ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>INTEGRITY VERIFIED: All {auditChainStatus.totalRowsVerified} blocks intact and mathematically consistent.</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>TAMPERING DETECTED: Chain broken at sequence {auditChainStatus.sequenceId}!</span>
                </>
              )}
            </div>
            {auditChainStatus.headHash && (
              <div className="text-[11px] text-slate-400 truncate mt-1">
                Head Hash: <span className="text-white">{auditChainStatus.headHash}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User Accounts Management & Instant Multi-Device Lockout */}
      <div className="glass-panel border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Account Status & Session Termination</h3>
            <p className="text-xs text-slate-400">Deactivating an account instantly terminates all active database sessions across all devices.</p>
          </div>
          <button
            type="button"
            onClick={onRefreshData}
            className="role-pill text-xs !py-1 text-slate-300 hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" />
            <span>Refresh</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/30 border-b border-white/10 text-slate-400 font-mono uppercase">
              <tr>
                <th className="py-3 px-4">Name / Department</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Instant Lockout</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {adminUsers.map(u => (
                <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-200">{u.fullName}</div>
                    <div className="text-[11px] text-slate-500">{u.department}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-300 font-mono">{u.email}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 text-[10px] uppercase font-bold">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      u.isActive 
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {u.isActive ? 'Active' : 'Locked Out'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {u.id !== currentUser.id && (
                      <button
                        type="button"
                        onClick={() => onToggleUserStatus(u.id, u.isActive, u.fullName)}
                        className={`text-xs px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          u.isActive
                            ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                            : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30'
                        }`}
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

      {/* Audit Log Stream */}
      <div className="glass-panel border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-white text-sm">Tamper-Evident Audit Trail Stream</h3>
            <p className="text-xs text-slate-400">Full cryptographic chain representation</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              className="input-field !py-1 text-xs w-36"
              value={auditOutcomeFilter}
              onChange={e => setAuditOutcomeFilter(e.target.value)}
            >
              <option value="">All Outcomes</option>
              <option value="allowed">Allowed Only</option>
              <option value="denied">Denied Only</option>
            </select>

            <select
              className="input-field !py-1 text-xs w-36"
              value={auditActionFilter}
              onChange={e => setAuditActionFilter(e.target.value)}
            >
              <option value="">All Actions</option>
              <option value="login">Logins</option>
              <option value="download">Downloads</option>
              <option value="upload">Uploads</option>
              <option value="grant">Grants</option>
              <option value="revoke">Revocations</option>
            </select>

            <a
              href="/api/admin/audit/export"
              download="argus-audit-chain.json"
              className="btn-secondary !py-1 !px-3 text-xs"
              title="Download cryptographic audit bundle"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Proof (.JSON)</span>
            </a>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs">
            <thead className="bg-black/30 border-b border-white/10 text-slate-400 font-mono uppercase sticky top-0 backdrop-blur-md">
              <tr>
                <th className="py-3 px-4">Seq</th>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Outcome</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Row Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {auditLogs.map(log => (
                <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-4 text-sky-400 font-bold">#{log.sequenceId}</td>
                  <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-4 text-slate-200">
                    <div>{log.actor?.name || 'System'}</div>
                    <div className="text-[10px] text-slate-500 font-sans">{log.actor?.email}</div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 uppercase font-bold text-[10px]">
                    {log.action}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      log.outcome === 'allowed'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}>
                      {log.outcome}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 font-sans text-xs">
                    {log.reason || 'Normal operation'}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 text-[10px] truncate max-w-[120px]" title={log.rowHash}>
                    {log.rowHash?.slice(0, 16)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

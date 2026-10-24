import React from 'react';
import { 
  Users, Sparkles, X, Plus, Trash2, 
  ShieldCheck, AlertCircle, CheckCircle2, Bot
} from 'lucide-react';

export default function GrantsModal({
  selectedDoc,
  docGrants,
  grantEmail,
  setGrantEmail,
  grantPermission,
  setGrantPermission,
  granting,
  aiSuggestions,
  loadingAi,
  onClose,
  onGrant,
  onRevoke,
  onFetchAiSuggestions
}) {
  if (!selectedDoc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-2xl border border-white/20 shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Named Access Control & Grants</h3>
              <p className="text-xs text-slate-400">File: <span className="text-sky-300 font-mono">{selectedDoc.title}</span></p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* AI Grant Recommendations Box (Phase 5 Feature) */}
        <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900/60 border border-indigo-500/30">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <Bot className="w-4 h-4 text-purple-400" />
              <span>AI Access Assistant (Google Gemini 3.5 Flash-Lite)</span>
            </div>
            <button
              type="button"
              onClick={onFetchAiSuggestions}
              disabled={loadingAi}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
              <span>{loadingAi ? 'Analyzing Context...' : 'Suggest Recipients'}</span>
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-3">
            Purely advisory human-in-the-loop assistant. Uses document metadata to recommend appropriate role and department recipients.
          </p>

          {aiSuggestions && (
            <div className="space-y-2 mt-3 pt-3 border-t border-white/10 text-xs">
              <div className="text-[11px] font-mono text-purple-300">
                Model: {aiSuggestions.model || 'Heuristic Fallback'} • Recommendations:
              </div>
              {aiSuggestions.suggestions?.length === 0 ? (
                <div className="text-slate-400 italic">No additional recipients recommended for this category.</div>
              ) : (
                aiSuggestions.suggestions?.map((s, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg bg-black/30 border border-white/5">
                    <div>
                      <div className="font-semibold text-slate-200">{s.fullName} ({s.email})</div>
                      <div className="text-[11px] text-slate-400">{s.reason}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setGrantEmail(s.email);
                        setGrantPermission(s.permission || 'read');
                      }}
                      className="px-2.5 py-1 rounded bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-semibold transition-all cursor-pointer"
                    >
                      Fill Form
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Grant New Permission Form */}
        <form onSubmit={onGrant} className="space-y-3 mb-6 p-4 rounded-xl bg-slate-950/60 border border-white/10">
          <h4 className="text-xs font-bold uppercase text-slate-400">Grant Named Access:</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-6">
              <input
                type="email"
                required
                className="input-field w-full text-xs placeholder:text-slate-500"
                placeholder="Enter recipient email (e.g. viewer1@argus.local)"
                value={grantEmail}
                onChange={e => setGrantEmail(e.target.value)}
              />
            </div>
            
            <div className="sm:col-span-3">
              <select
                className="input-field w-full text-xs"
                value={grantPermission}
                onChange={e => setGrantPermission(e.target.value)}
              >
                <option value="read">Read Only</option>
                <option value="edit">Read & Edit</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={granting || !grantEmail}
                className="btn-primary w-full !py-2.5 text-xs whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>{granting ? 'Granting...' : 'Grant Access'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Existing Grants List */}
        <div>
          <h4 className="text-xs font-bold uppercase text-slate-400 mb-3">Active & Historical Grants:</h4>
          
          {docGrants.length === 0 ? (
            <div className="p-6 text-center text-slate-500 border border-dashed border-white/10 rounded-xl text-xs">
              No grants issued. Only you (the document owner) can access this file.
            </div>
          ) : (
            <div className="space-y-2">
              {docGrants.map(g => (
                <div 
                  key={g.id} 
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all text-xs ${
                    g.revoked 
                      ? 'bg-rose-500/5 border-rose-500/20 opacity-60' 
                      : 'bg-white/5 border-white/10'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-200">
                      {g.grantee?.name} <span className="font-mono text-slate-400 font-normal">({g.grantee?.email})</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Permission: <span className="text-sky-400 font-bold uppercase">{g.permission}</span> • 
                      Status: <span className={g.revoked ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold'}>
                        {g.revoked ? 'REVOKED' : 'ACTIVE'}
                      </span>
                    </div>
                  </div>

                  {!g.revoked && (
                    <button
                      type="button"
                      onClick={() => onRevoke(g.id)}
                      className="btn-danger !py-1 !px-2.5 text-xs"
                      title="Revoke named access immediately"
                    >
                      Revoke Now
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

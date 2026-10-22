import React, { useState } from 'react';
import { Edit3, X, Check, FileText } from 'lucide-react';

export default function EditDocumentModal({
  document,
  isOpen,
  onClose,
  onSave
}) {
  if (!isOpen || !document) return null;

  const [title, setTitle] = useState(document.title);
  const [category, setCategory] = useState(document.category || 'General');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Document title cannot be empty.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSave(document.id, { title: title.trim(), category });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update document.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="glass-panel w-full max-w-lg border border-white/20 shadow-2xl p-6 sm:p-8 relative overflow-hidden rounded-3xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Edit Document Metadata</h3>
              <p className="text-xs text-slate-400 font-mono">
                {document.permission === 'owner' ? 'Owner Permission' : 'Granted Collaborative Edit Access'}
              </p>
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

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Document Title</label>
            <input
              type="text"
              required
              className="input-field"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Updated Engineering Specification"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Department Category</label>
            <select
              className="input-field"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="Engineering">Engineering</option>
              <option value="Finance">Finance</option>
              <option value="Legal">Legal</option>
              <option value="Compliance">Compliance</option>
              <option value="Research">Research</option>
              <option value="General">General</option>
            </select>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 text-[11px] text-slate-400 space-y-1">
            <div className="flex items-center gap-2 text-slate-300 font-semibold">
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Cryptographic Immutability Notice:</span>
            </div>
            <p>
              Modifying metadata generates a new tamper-evident audit record in PostgreSQL. The underlying ciphertext file and SHA-256 hash checksum remain anchored.
            </p>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn-secondary !py-2 !px-4 text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary !py-2 !px-5 text-xs !bg-gradient-to-r !from-amber-600 !to-orange-600 shadow-amber-950/40 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

import React from 'react';
import { 
  FileText, Download, Clock, Users, Trash2, 
  Search, Filter, UploadCloud, Cpu, ShieldAlert,
  Lock, CheckCircle2, Shield
} from 'lucide-react';

export default function DocumentsView({
  currentUser,
  documents,
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  uploadTitle,
  setUploadTitle,
  uploadCategory,
  setUploadCategory,
  selectedFile,
  setSelectedFile,
  uploading,
  activeTicket,
  onUpload,
  onDownload,
  onGenerateTicket,
  onOpenGrantsModal,
  onDeleteDocument,
  onLogoutAll
}) {
  return (
    <div className="space-y-6">

      {/* Top Banner: Upload (Owners) & Security Guarantees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upload Card */}
        <div className="lg:col-span-2 glass-panel p-6 border border-white/10">
          <div className="flex items-center gap-2 mb-4 text-sky-400">
            <UploadCloud className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Upload Document & Envelope Encrypt</h3>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
              AES-256-GCM
            </span>
          </div>

          <form onSubmit={onUpload} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                className="input-field"
                placeholder="Custom Document Title (optional)"
                value={uploadTitle}
                onChange={e => setUploadTitle(e.target.value)}
              />
              <select
                className="input-field"
                value={uploadCategory}
                onChange={e => setUploadCategory(e.target.value)}
              >
                <option value="Engineering">Department: Engineering</option>
                <option value="Finance">Department: Finance</option>
                <option value="Legal">Department: Legal</option>
                <option value="Compliance">Department: Compliance</option>
                <option value="General">Department: General</option>
              </select>
            </div>

            {/* Drag & Drop File Input */}
            <div className="border-2 border-dashed border-white/10 hover:border-sky-500/30 rounded-xl p-5 text-center bg-black/20 transition-all">
              <input
                type="file"
                id="docUploadInput"
                className="hidden"
                onChange={e => setSelectedFile(e.target.files[0])}
              />
              <label htmlFor="docUploadInput" className="cursor-pointer block">
                <FileText className={`w-8 h-8 mx-auto mb-2 ${selectedFile ? 'text-emerald-400' : 'text-slate-500'}`} />
                <p className="text-sm font-semibold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Select or drop a confidential file'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Validated against magic bytes • PDF, DOCX, XLSX, PNG, JPG, TXT (Max 10MB)
                </p>
              </label>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="btn-primary"
              >
                {uploading ? 'Validating Magic Bytes & Encrypting...' : 'Upload & Encrypt Blob'}
              </button>
            </div>
          </form>
        </div>

        {/* Security Policy Summary & Global Killswitch */}
        <div className="glass-panel p-6 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3 text-emerald-400">
              <Cpu className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Active Enforcements</h3>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-sky-400 font-bold">•</span>
                <span><strong>Choke Point:</strong> Every request validated by server-side <code className="font-mono text-sky-400">authorize()</code>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                <span><strong>Anti-IDOR:</strong> Unpermitted file requests yield uniform <strong>404 Not Found</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 font-bold">•</span>
                <span><strong>Instant Revocation:</strong> Grants re-queried directly on DB every time.</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-white/10 mt-4">
            <button
              type="button"
              onClick={onLogoutAll}
              className="btn-danger w-full !bg-amber-500/10 !border-amber-500/30 !text-amber-300 hover:!bg-amber-500/20 text-xs"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Emergency: Kill All Active Sessions</span>
            </button>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="input-field !py-1.5 text-xs"
            placeholder="Search documents by title or filename..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            className="input-field !py-1.5 text-xs w-44"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Finance">Finance</option>
            <option value="Legal">Legal</option>
            <option value="Compliance">Compliance</option>
            <option value="General">General</option>
          </select>
        </div>
      </div>

      {/* Documents Data Table */}
      <div className="glass-panel border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Permitted Documents Repository</h3>
            <p className="text-xs text-slate-400">Strictly filtered by server-side permissions</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {documents.length} Available {documents.length === 1 ? 'File' : 'Files'}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm font-semibold">No documents accessible to your account.</p>
            <p className="text-xs mt-1">Upload a file or request an owner to grant named permissions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/30 border-b border-white/10 text-slate-400 font-mono uppercase">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Owner</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Access Level</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-200">
                      <div>{doc.title}</div>
                      <div className="text-[11px] font-mono text-slate-500">{doc.originalFilename}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {doc.ownerName}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10 text-[10px]">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase ${
                        doc.permission === 'owner' 
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {doc.permission}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        
                        {/* Download & Decrypt Button */}
                        <button
                          type="button"
                          onClick={() => onDownload(doc.id, doc.originalFilename)}
                          className="btn-primary !py-1 !px-2.5 !text-xs"
                          title="Stream & Decrypt Ciphertext"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        {/* 60s Ephemeral Ticket */}
                        <button
                          type="button"
                          onClick={() => onGenerateTicket(doc.id)}
                          className="role-pill !py-1 !px-2.5 text-xs text-slate-300 hover:text-white"
                          title="Generate single-use 60s ticket"
                        >
                          <Clock className="w-3 h-3 text-sky-400 inline mr-1" />
                          <span>Ticket</span>
                        </button>

                        {/* Grants Management (Owner Only) */}
                        {doc.permission === 'owner' && (
                          <button
                            type="button"
                            onClick={() => onOpenGrantsModal(doc)}
                            className="role-pill !py-1 !px-2.5 text-xs text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                            title="Manage Access & Ask AI"
                          >
                            <Users className="w-3 h-3 inline mr-1" />
                            <span>Grants</span>
                          </button>
                        )}

                        {/* Soft Delete (Owner Only) */}
                        {doc.permission === 'owner' && (
                          <button
                            type="button"
                            onClick={() => onDeleteDocument(doc.id)}
                            className="btn-danger !py-1 !px-2 text-xs"
                            title="Soft Delete Document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active Ticket Display Banner */}
      {activeTicket && (
        <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Clock className="w-4 h-4 text-sky-400" />
            <span>Active Download Ticket:</span>
            <code className="font-mono text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-500/30">
              {activeTicket.ticket}
            </code>
            <span className="text-slate-400">(Expires in 60s • Auto-invalidates on revocation)</span>
          </div>

          <a
            href={`/api/documents/tickets/${activeTicket.ticket}/download`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary !py-1 !px-3 text-xs"
          >
            Direct Fetch via Ticket
          </a>
        </div>
      )}

    </div>
  );
}

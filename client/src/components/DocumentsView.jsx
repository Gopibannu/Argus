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
    <div className="space-y-8">

      {/* Top Banner: Upload (Owners) & Security Guarantees */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Upload Card */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-7 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5 text-sky-400">
                <UploadCloud className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Secure Upload & Envelope Encrypt</h3>
              </div>
              <span className="text-[10px] uppercase font-mono px-2.5 py-0.5 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20 font-bold tracking-wider">
                AES-256-GCM
              </span>
            </div>

            <form onSubmit={onUpload} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Document Title</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Q4 Financial Audit Report"
                    value={uploadTitle}
                    onChange={e => setUploadTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Department Category</label>
                  <select
                    className="input-field"
                    value={uploadCategory}
                    onChange={e => setUploadCategory(e.target.value)}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Finance">Finance</option>
                    <option value="Legal">Legal</option>
                    <option value="Compliance">Compliance</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              {/* Drag & Drop File Input */}
              <div className="border-2 border-dashed border-white/10 hover:border-sky-500/40 rounded-2xl p-6 text-center bg-black/20 transition-all cursor-pointer">
                <input
                  type="file"
                  id="docUploadInput"
                  className="hidden"
                  onChange={e => setSelectedFile(e.target.files[0])}
                />
                <label htmlFor="docUploadInput" className="cursor-pointer block">
                  <FileText className={`w-10 h-10 mx-auto mb-2.5 ${selectedFile ? 'text-emerald-400' : 'text-slate-500'}`} />
                  <p className="text-sm font-semibold text-slate-200">
                    {selectedFile ? selectedFile.name : 'Click to browse or drop document'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Magic bytes validated • PDF, DOCX, XLSX, PNG, JPG, TXT (Max 10MB)
                  </p>
                </label>
              </div>

              <div className="flex justify-end pt-2">
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
        </div>

        {/* Security Policy Summary & Global Killswitch */}
        <div className="glass-panel p-6 sm:p-7 border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4 text-emerald-400">
              <Cpu className="w-5 h-5" />
              <h3 className="font-bold text-white text-base">Active Enforcements</h3>
            </div>

            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <span><strong>Choke Point:</strong> Every request validated by server-side <code className="font-mono text-sky-400 text-[11px]">authorize()</code>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                <span><strong>Anti-IDOR:</strong> Ungranted document accesses yield uniform <strong>404 Not Found</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span><strong>Instant Revocation:</strong> Grants re-queried directly on DB every single time.</span>
              </li>
            </ul>
          </div>

          <div className="pt-6 border-t border-white/10 mt-6">
            <button
              type="button"
              onClick={onLogoutAll}
              className="btn-danger w-full !bg-amber-500/10 !border-amber-500/30 !text-amber-300 hover:!bg-amber-500/20 text-xs py-2.5"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>Emergency: Kill All Active Sessions</span>
            </button>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="glass-panel p-4 border border-white/10 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            className="input-field !py-2 text-xs"
            placeholder="Search documents by title or filename..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            className="input-field !py-2 text-xs w-48"
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
      <div className="glass-panel border border-white/10 overflow-hidden rounded-2xl">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Permitted Documents Repository</h3>
            <p className="text-xs text-slate-400 mt-0.5">Strictly filtered by server-side permissions</p>
          </div>
          <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
            {documents.length} Available {documents.length === 1 ? 'File' : 'Files'}
          </span>
        </div>

        {documents.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-400">No documents accessible to your account.</p>
            <p className="text-xs mt-1">Upload a file or request an owner to grant named permissions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-black/30 border-b border-white/10 text-slate-400 font-mono uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Document Title</th>
                  <th className="py-3.5 px-6">Owner</th>
                  <th className="py-3.5 px-6">Category</th>
                  <th className="py-3.5 px-6">Access Level</th>
                  <th className="py-3.5 px-6">Size</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      <div className="text-sm font-medium">{doc.title}</div>
                      <div className="text-[11px] font-mono text-slate-500 mt-0.5">{doc.originalFilename}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-300">
                      {doc.ownerName}
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-md bg-white/5 text-slate-300 border border-white/10 text-[11px]">
                        {doc.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono font-bold">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider ${
                        doc.permission === 'owner' 
                          ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30' 
                          : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {doc.permission}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-400">
                      {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="inline-flex items-center gap-2">
                        
                        {/* Download & Decrypt Button */}
                        <button
                          type="button"
                          onClick={() => onDownload(doc.id, doc.originalFilename)}
                          className="btn-primary !py-1.5 !px-3 !text-xs cursor-pointer"
                          title="Stream & Decrypt Ciphertext"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>

                        {/* 60s Ephemeral Ticket */}
                        <button
                          type="button"
                          onClick={() => onGenerateTicket(doc.id)}
                          className="role-pill !py-1.5 !px-3 text-xs text-slate-300 hover:text-white"
                          title="Generate single-use 60s ticket"
                        >
                          <Clock className="w-3.5 h-3.5 text-sky-400" />
                          <span>Ticket</span>
                        </button>

                        {/* Grants Management (Owner Only) */}
                        {doc.permission === 'owner' && (
                          <button
                            type="button"
                            onClick={() => onOpenGrantsModal(doc)}
                            className="role-pill !py-1.5 !px-3 text-xs text-sky-400 border-sky-500/30 hover:bg-sky-500/10"
                            title="Manage Access & Ask AI"
                          >
                            <Users className="w-3.5 h-3.5" />
                            <span>Grants</span>
                          </button>
                        )}

                        {/* Soft Delete (Owner Only) */}
                        {doc.permission === 'owner' && (
                          <button
                            type="button"
                            onClick={() => onDeleteDocument(doc.id)}
                            className="btn-danger !py-1.5 !px-2.5 text-xs cursor-pointer"
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
        <div className="p-4 sm:p-5 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-xs text-slate-300">
            <Clock className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Active Download Ticket:</span>
            <code className="font-mono text-sky-300 bg-sky-950/70 px-2.5 py-1 rounded-lg border border-sky-500/30 font-bold">
              {activeTicket.ticket}
            </code>
            <span className="text-slate-400 hidden md:inline">(Expires in 60s • Auto-invalidates on revocation)</span>
          </div>

          <a
            href={`/api/documents/tickets/${activeTicket.ticket}/download`}
            target="_blank"
            rel="noreferrer"
            className="btn-primary !py-1.5 !px-4 text-xs"
          >
            Direct Fetch via Ticket
          </a>
        </div>
      )}

    </div>
  );
}

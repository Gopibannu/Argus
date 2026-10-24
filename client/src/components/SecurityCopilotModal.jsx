import React, { useState } from 'react';
import { Bot, Send, Sparkles, X, Minimize2, Maximize2, Shield, User, RefreshCw } from 'lucide-react';

export default function SecurityCopilotModal({ isOpen, onClose, currentUser, csrfToken }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello ${currentUser?.fullName || 'Operator'}, I am your Argus Zero-Trust Copilot powered by Gemini 3.5 Flash-Lite. You can ask me anything about our cryptographic envelope encryption, mathematical hash chain, Anti-IDOR single choke point, or role permissions.`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  async function handleSend(e) {
    if (e) e.preventDefault();
    const query = inputQuery.trim();
    if (!query || loading) return;

    const userMessage = { role: 'user', text: query };
    setMessages(prev => [...prev, userMessage]);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/copilot-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken || ''
        },
        body: JSON.stringify({ query })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get Copilot response.');

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply,
          model: data.modelUsed
        }
      ]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Copilot encountered an issue: ${err.message}`,
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  const promptStarters = [
    'How does Anti-IDOR prevent data leaks?',
    'Explain the SHA-256 hash chain audit trail.',
    'What happens when an owner revokes a grant?'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="glass-panel w-full max-w-2xl border border-sky-500/30 shadow-2xl rounded-2xl flex flex-col h-[600px] overflow-hidden bg-[#070b18]/95">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-sky-950/60 via-indigo-950/40 to-black/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-sm">Argus Security Copilot Agent</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-semibold">
                  Gemini 3.5 Flash-Lite
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Zero-Trust Technical Architecture & Threat Defense</p>
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

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 text-xs">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                m.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {m.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[82%] p-3.5 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-sky-600 text-white rounded-br-xs shadow-md shadow-sky-950/50'
                    : m.isError
                      ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
                      : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-xs'
                }`}
              >
                <div className="leading-relaxed whitespace-pre-wrap">{m.text}</div>
                {m.model && (
                  <div className="mt-2 text-[10px] font-mono text-sky-400/80 border-t border-white/5 pt-1">
                    Powered by: {m.model}
                  </div>
                )}
              </div>

              {m.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-800 border border-white/10 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2.5 text-slate-400 text-xs italic p-2">
              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
              <span>Copilot Agent evaluating security policies via Gemini 3.5 Flash-Lite...</span>
            </div>
          )}
        </div>

        {/* Prompt Starters */}
        <div className="px-4 py-2 bg-black/40 border-t border-white/5 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider shrink-0">Quick Ask:</span>
          {promptStarters.map((starter, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setInputQuery(starter)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white transition-all whitespace-nowrap cursor-pointer"
            >
              {starter}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-3 bg-black/50 border-t border-white/10 flex items-center gap-2">
          <input
            type="text"
            className="input-field flex-1 !py-2.5 text-xs placeholder:text-slate-500"
            placeholder="Ask Copilot about encryption, IDOR, triggers, or tickets..."
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="btn-primary !py-2.5 !px-4 text-xs shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Send</span>
          </button>
        </form>

      </div>
    </div>
  );
}

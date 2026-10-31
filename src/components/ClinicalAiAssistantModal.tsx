import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, X, ShieldAlert } from 'lucide-react';
import { queryClinicalAssistant, type AssistantResponse } from '@/utils/clinicalLlmEngine';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  response?: AssistantResponse;
  timestamp: string;
}

export function ClinicalAiAssistantModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello, Doctor! I am your **RuralCare Clinical Copilot**. I am trained on WHO & ICMR rural primary health guidelines, antibiotic regimens, vital signs evaluation, and acute triage emergency red flags. How can I assist with your patient today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen, messages, isTyping]);

  if (!isOpen) return null;

  const handleSend = (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const res = queryClinicalAssistant(text);
      const aiMsg: Message = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 450);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-card border border-surface-borderLight w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col h-[640px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-cyan-900/40 via-sky-900/30 to-indigo-900/40 border-b border-surface-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-700 shadow-sm">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink text-sm sm:text-base">RuralCare Clinical AI Assistant</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 font-bold uppercase tracking-wider">
                  Trained LLM
                </span>
              </div>
              <p className="text-xs text-slate-600 font-sans mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                100% Offline Clinical Decision Engine • WHO & ICMR Guidelines
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface text-slate-500 hover:text-ink transition"
            aria-label="Close assistant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-sm">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 space-y-2 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-cyan-600 text-white rounded-br-none'
                    : 'bg-surface border border-surface-border text-ink rounded-bl-none'
                }`}
              >
                {/* Text render with basic markdown formatting */}
                <div className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                  {msg.text.split('\n').map((line, idx) => {
                    if (line.startsWith('### ')) {
                      return <h4 key={idx} className="font-bold text-sm text-cyan-800 mb-1">{line.replace('### ', '')}</h4>;
                    }
                    if (line.startsWith('**') && line.endsWith('**')) {
                      return <strong key={idx} className="block mt-2 font-bold text-ink">{line.replaceAll('**', '')}</strong>;
                    }
                    if (line.startsWith('• ')) {
                      return <div key={idx} className="pl-2 border-l-2 border-cyan-400/40 my-0.5">{line}</div>;
                    }
                    return <p key={idx}>{line}</p>;
                  })}
                </div>

                <div
                  className={`text-[10px] flex items-center justify-between gap-3 pt-1 border-t ${
                    msg.sender === 'user' ? 'border-cyan-500/50 text-cyan-100' : 'border-surface-border text-slate-500'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.response?.confidence && (
                    <span>Confidence: {Math.round(msg.response.confidence * 100)}%</span>
                  )}
                </div>
              </div>

              {/* Suggestions chips */}
              {msg.response?.suggestions && (
                <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                  {msg.response.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full bg-surface hover:bg-cyan-50 border border-surface-border hover:border-cyan-300 text-slate-700 hover:text-cyan-900 transition flex items-center gap-1"
                    >
                      <Sparkles size={11} className="text-cyan-600" />
                      <span>{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div className="flex items-center gap-2 text-slate-500 text-xs p-2">
              <Bot size={16} className="text-cyan-600 animate-spin" />
              <span>Analyzing primary care knowledge base…</span>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input box */}
        <div className="p-3 bg-surface border-t border-surface-border">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about symptoms, dosages, emergency triage rules (e.g., 'Fever and chills for 3 days')…"
              className="input flex-1 text-xs sm:text-sm py-2.5"
              autoFocus
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="btn-primary py-2.5 px-4 flex items-center gap-1.5 font-bold"
            >
              <span>Ask</span>
              <Send size={15} />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 px-1">
            <span className="flex items-center gap-1">
              <ShieldAlert size={12} className="text-amber-600" />
              Decision support tool for qualified health workers.
            </span>
            <span className="hidden sm:inline">Ctrl+K for Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}

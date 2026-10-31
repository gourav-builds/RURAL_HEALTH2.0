import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot, Send, Sparkles, X, ShieldAlert, Play, CheckCircle2,
  AlertTriangle, Database, Activity, RefreshCw,
  ExternalLink, Layers
} from 'lucide-react';
import { queryClinicalAssistant, type AssistantResponse } from '@/utils/clinicalLlmEngine';
import {
  runClinicalAgent,
  AGENT_PLAYBOOKS,
  type AgentExecutionStep,
  type AgentExecutionResult,
  type AgentActionTaken,
} from '@/utils/clinicalAgent';

interface QAMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  response?: AssistantResponse;
  timestamp: string;
}

export function ClinicalAiAssistantModal({
  isOpen,
  onClose,
  initialTab = 'agent',
  autoPlaybookId,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'agent' | 'qa';
  autoPlaybookId?: string;
}) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'agent' | 'qa'>(initialTab);

  // QA State
  const [qaMessages, setQaMessages] = useState<QAMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Hello, Doctor! I am your **RuralCare Clinical Copilot**. I am trained on WHO & ICMR rural primary health guidelines, antibiotic regimens, vital signs evaluation, and acute triage emergency red flags. How can I assist with your patient today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [qaInput, setQaInput] = useState('');
  const [isQaTyping, setIsQaTyping] = useState(false);
  const bottomQaRef = useRef<HTMLDivElement>(null);

  // Agent State
  const [agentGoal, setAgentGoal] = useState('');
  const [isAgentRunning, setIsAgentRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<AgentExecutionStep | null>(null);
  const [agentResult, setAgentResult] = useState<AgentExecutionResult | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (isOpen) {
      if (autoPlaybookId) {
        const pb = AGENT_PLAYBOOKS.find(p => p.id === autoPlaybookId);
        if (pb) {
          setActiveTab('agent');
          setAgentGoal(pb.defaultGoal);
          executeAgentTask(pb.defaultGoal, pb.id);
        }
      } else {
        setActiveTab(initialTab);
      }
      if (activeTab === 'qa') {
        setTimeout(() => bottomQaRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    }
  }, [isOpen, autoPlaybookId, initialTab]);

  if (!isOpen) return null;

  // Handle Q&A Send
  const handleQaSend = (textToSend?: string) => {
    const text = (textToSend || qaInput).trim();
    if (!text) return;

    const userMsg: QAMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setQaMessages(prev => [...prev, userMsg]);
    setQaInput('');
    setIsQaTyping(true);

    setTimeout(() => {
      const res = queryClinicalAssistant(text);
      const aiMsg: QAMessage = {
        id: `ai-${Date.now()}`,
        sender: 'assistant',
        text: res.answer,
        response: res,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setQaMessages(prev => [...prev, aiMsg]);
      setIsQaTyping(false);
    }, 400);
  };

  // Handle Agent Execution
  const executeAgentTask = async (goalToRun: string, playbookId?: string) => {
    const goal = goalToRun.trim();
    if (!goal) return;

    setIsAgentRunning(true);
    setAgentResult(null);
    setCurrentStep(null);
    setExpandedSteps({});

    try {
      const res = await runClinicalAgent(goal, {
        playbookId,
        onStep: (step) => {
          setCurrentStep(step);
        },
      });
      setAgentResult(res);
      // Auto expand all steps
      const map: Record<number, boolean> = {};
      res.steps.forEach(s => { map[s.stepNumber] = true; });
      setExpandedSteps(map);
    } catch (err) {
      console.error('Agent execution error:', err);
    } finally {
      setIsAgentRunning(false);
      setCurrentStep(null);
    }
  };

  const toggleStepExpand = (stepNumber: number) => {
    setExpandedSteps(prev => ({ ...prev, [stepNumber]: !prev[stepNumber] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface-card border border-surface-borderLight w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col h-[720px] max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-cyan-950/80 via-sky-950/70 to-indigo-950/80 border-b border-surface-border text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-base">RuralCare AI Intelligence</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 font-bold uppercase tracking-wider">
                  100% Offline Engine
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Autonomous Clinical Agent & WHO/ICMR Decision Copilot
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition"
            aria-label="Close assistant"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-surface-border bg-surface px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('agent')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
              activeTab === 'agent'
                ? 'bg-surface-card border-cyan-500 text-cyan-800 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-ink'
            }`}
          >
            <Sparkles size={15} className="text-cyan-600" />
            <span>Autonomous Agent</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-800 font-semibold">
              8 Tools
            </span>
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition border-b-2 ${
              activeTab === 'qa'
                ? 'bg-surface-card border-cyan-500 text-cyan-800 shadow-sm'
                : 'border-transparent text-slate-600 hover:text-ink'
            }`}
          >
            <Layers size={15} className="text-indigo-600" />
            <span>Clinical Guidelines Copilot (Q&A)</span>
          </button>
        </div>

        {/* TAB 1: AUTONOMOUS AGENT */}
        {activeTab === 'agent' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-surface-subtle">
            {/* Playbooks bar */}
            <div className="p-3 bg-surface border-b border-surface-border">
              <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Activity size={12} className="text-cyan-600" />
                One-Click Agentic Playbooks (Runs Autonomous Multi-Step Reasoning)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {AGENT_PLAYBOOKS.map((pb) => (
                  <button
                    key={pb.id}
                    disabled={isAgentRunning}
                    onClick={() => {
                      setAgentGoal(pb.defaultGoal);
                      executeAgentTask(pb.defaultGoal, pb.id);
                    }}
                    className="p-2 text-left rounded-xl bg-surface-card border border-surface-border hover:border-cyan-400 hover:shadow-sm transition disabled:opacity-50 flex flex-col justify-between group"
                  >
                    <div>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-800 border border-cyan-200">
                        {pb.badge}
                      </span>
                      <h4 className="font-bold text-xs text-ink mt-1 group-hover:text-cyan-700 line-clamp-1">
                        {pb.title}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2 font-medium">
                      <span>Execute</span>
                      <Play size={10} className="text-cyan-600 fill-cyan-600" />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Goal Input */}
            <div className="p-3 bg-surface border-b border-surface-border">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeAgentTask(agentGoal);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={agentGoal}
                  onChange={(e) => setAgentGoal(e.target.value)}
                  placeholder="Give the offline agent a clinical goal (e.g., 'Audit unreviewed consultations', 'Draft follow-up for Aarav Sharma', 'Verify outbox queue')..."
                  className="input flex-1 text-xs sm:text-sm py-2"
                  disabled={isAgentRunning}
                />
                <button
                  type="submit"
                  disabled={!agentGoal.trim() || isAgentRunning}
                  className="btn-primary py-2 px-3.5 flex items-center gap-1.5 text-xs font-bold"
                >
                  {isAgentRunning ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Reasoning...</span>
                    </>
                  ) : (
                    <>
                      <Play size={14} className="fill-white" />
                      <span>Run Agent</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Execution Workspace Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 font-sans text-sm">
              {/* Running Status Indicator */}
              {isAgentRunning && (
                <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-200 text-cyan-900 flex items-center justify-between animate-pulse">
                  <div className="flex items-center gap-2.5">
                    <RefreshCw size={16} className="animate-spin text-cyan-600" />
                    <div>
                      <p className="font-bold text-xs">Autonomous Agent Active (ReAct Planning Loop)</p>
                      <p className="text-[11px] text-cyan-700 font-sans">
                        {currentStep ? currentStep.thought : 'Formulating execution plan and selecting offline tools...'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-1 rounded bg-cyan-100 text-cyan-800 font-bold">
                    STEP {currentStep?.stepNumber ?? 1}
                  </span>
                </div>
              )}

              {/* Execution Steps Trace */}
              {agentResult && agentResult.steps.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={13} className="text-cyan-600" />
                      Execution Trace ({agentResult.steps.length} Steps in {agentResult.executionTimeMs}ms)
                    </h4>
                    <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 size={12} />
                      Execution Succeeded Offline
                    </span>
                  </div>

                  <div className="space-y-2">
                    {agentResult.steps.map((step) => {
                      const isExpanded = expandedSteps[step.stepNumber];
                      return (
                        <div
                          key={step.stepNumber}
                          className="rounded-xl border border-surface-border bg-surface-card overflow-hidden shadow-xs"
                        >
                          <button
                            type="button"
                            onClick={() => toggleStepExpand(step.stepNumber)}
                            className="w-full p-2.5 bg-surface text-left flex items-center justify-between hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold flex items-center justify-center">
                                {step.stepNumber}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  tool: {step.toolName}
                                </span>
                                <span className="text-xs text-slate-600 line-clamp-1">
                                  {step.thought}
                                </span>
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {step.timestamp}
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="p-3 border-t border-surface-border space-y-2 text-xs bg-white">
                              <div>
                                <span className="font-bold text-slate-700 text-[11px]">🧠 Reasoning / Thought:</span>
                                <p className="text-slate-600 mt-0.5">{step.thought}</p>
                              </div>

                              <div>
                                <span className="font-bold text-slate-700 text-[11px]">🔧 Tool Arguments:</span>
                                <pre className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-700 overflow-x-auto">
                                  {JSON.stringify(step.toolArgs, null, 2)}
                                </pre>
                              </div>

                              <div>
                                <span className="font-bold text-slate-700 text-[11px]">👁️ Local Observation (IndexedDB Output):</span>
                                <pre className="mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-mono text-slate-700 overflow-x-auto max-h-48">
                                  {JSON.stringify(step.observation, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Actions Executed In Database */}
              {agentResult && agentResult.actionsTaken.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2">
                  <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Database size={13} className="text-emerald-700" />
                    Database Mutations Executed ({agentResult.actionsTaken.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {agentResult.actionsTaken.map((act: AgentActionTaken, idx: number) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-white border border-emerald-200 flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{act.title}</p>
                          <p className="text-[11px] text-slate-600">{act.description}</p>
                        </div>
                        {act.entityId && (
                          <button
                            onClick={() => {
                              onClose();
                              if (act.type === 'consultation_created' || act.type === 'triage_flagged') {
                                navigate(`/consultations/${act.entityId}`);
                              }
                            }}
                            className="p-1 rounded hover:bg-slate-100 text-cyan-700 flex items-center gap-1 text-[11px] font-semibold"
                            title="Open record in workstation"
                          >
                            <span>Open</span>
                            <ExternalLink size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Synthesized Clinical Report */}
              {agentResult && (
                <div className="p-4 rounded-xl bg-surface-card border border-surface-border space-y-2">
                  <h4 className="text-xs font-bold text-cyan-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 size={14} className="text-cyan-600" />
                    Synthesized Clinical Report
                  </h4>
                  <div className="whitespace-pre-line text-xs sm:text-sm text-ink leading-relaxed">
                    {agentResult.finalAnswer.split('\n').map((line, idx) => {
                      if (line.startsWith('### ')) {
                        return (
                          <h4 key={idx} className="font-bold text-sm text-cyan-900 mt-2 mb-1">
                            {line.replace('### ', '')}
                          </h4>
                        );
                      }
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <strong key={idx} className="block mt-2 font-bold text-ink">
                            {line.replaceAll('**', '')}
                          </strong>
                        );
                      }
                      if (line.startsWith('• ')) {
                        return (
                          <div key={idx} className="pl-2 border-l-2 border-cyan-400 my-1">
                            {line}
                          </div>
                        );
                      }
                      return <p key={idx}>{line}</p>;
                    })}
                  </div>
                </div>
              )}

              {/* Initial Empty State Guide */}
              {!isAgentRunning && !agentResult && (
                <div className="p-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-100 border border-cyan-200 text-cyan-700 flex items-center justify-center mx-auto">
                    <Bot size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-ink text-sm sm:text-base">
                      Autonomous Offline Clinical Agent Ready
                    </h4>
                    <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                      Equipped with 8 local tools to inspect IndexedDB, triage high-risk emergency cases,
                      audit pending offline records, and draft clinical notes automatically.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <button
                      onClick={() => {
                        const q = 'Audit local consultations and triage emergency red-flags';
                        setAgentGoal(q);
                        executeAgentTask(q, 'triage_audit');
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface hover:bg-cyan-50 border border-surface-border text-cyan-800 font-bold flex items-center gap-1.5 transition"
                    >
                      <AlertTriangle size={13} className="text-amber-600" />
                      <span>Run Triage Audit</span>
                    </button>
                    <button
                      onClick={() => {
                        const q = 'Verify offline sync queue integrity and check SHA-256 hashes';
                        setAgentGoal(q);
                        executeAgentTask(q, 'sync_integrity_check');
                      }}
                      className="text-xs px-3 py-1.5 rounded-lg bg-surface hover:bg-cyan-50 border border-surface-border text-cyan-800 font-bold flex items-center gap-1.5 transition"
                    >
                      <Database size={13} className="text-indigo-600" />
                      <span>Audit Outbox Hashes</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CLINICAL Q&A COPILOT */}
        {activeTab === 'qa' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 p-4 overflow-y-auto space-y-4 font-sans text-sm">
              {qaMessages.map(msg => (
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
                    <div className="whitespace-pre-line leading-relaxed text-xs sm:text-sm">
                      {msg.text.split('\n').map((line, idx) => {
                        if (line.startsWith('### ')) {
                          return (
                            <h4 key={idx} className="font-bold text-sm text-cyan-800 mb-1">
                              {line.replace('### ', '')}
                            </h4>
                          );
                        }
                        if (line.startsWith('**') && line.endsWith('**')) {
                          return (
                            <strong key={idx} className="block mt-2 font-bold text-ink">
                              {line.replaceAll('**', '')}
                            </strong>
                          );
                        }
                        if (line.startsWith('• ')) {
                          return (
                            <div key={idx} className="pl-2 border-l-2 border-cyan-400/40 my-0.5">
                              {line}
                            </div>
                          );
                        }
                        return <p key={idx}>{line}</p>;
                      })}
                    </div>

                    <div
                      className={`text-[10px] flex items-center justify-between gap-3 pt-1 border-t ${
                        msg.sender === 'user'
                          ? 'border-cyan-500/50 text-cyan-100'
                          : 'border-surface-border text-slate-500'
                      }`}
                    >
                      <span>{msg.timestamp}</span>
                      {msg.response?.confidence && (
                        <span>Confidence: {Math.round(msg.response.confidence * 100)}%</span>
                      )}
                    </div>
                  </div>

                  {msg.response?.suggestions && (
                    <div className="flex flex-wrap gap-1.5 mt-2 max-w-[85%]">
                      {msg.response.suggestions.map((s, i) => (
                        <button
                          key={i}
                          onClick={() => handleQaSend(s)}
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

              {isQaTyping && (
                <div className="flex items-center gap-2 text-slate-500 text-xs p-2">
                  <Bot size={16} className="text-cyan-600 animate-spin" />
                  <span>Analyzing primary care knowledge base…</span>
                </div>
              )}

              <div ref={bottomQaRef} />
            </div>

            {/* Q&A Input box */}
            <div className="p-3 bg-surface border-t border-surface-border">
              <form
                onSubmit={e => {
                  e.preventDefault();
                  handleQaSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={qaInput}
                  onChange={e => setQaInput(e.target.value)}
                  placeholder="Ask about symptoms, dosages, emergency triage rules (e.g., 'Fever and chills for 3 days')…"
                  className="input flex-1 text-xs sm:text-sm py-2.5"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!qaInput.trim()}
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
        )}

        {/* Footer info */}
        <div className="p-2.5 bg-slate-900 text-slate-300 text-[11px] flex items-center justify-between px-4 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Autonomous Engine: 8 Offline Tools Active</span>
          </div>
          <span className="text-slate-400 font-mono text-[10px]">
            IndexedDB Local Workspace
          </span>
        </div>
      </div>
    </div>
  );
}

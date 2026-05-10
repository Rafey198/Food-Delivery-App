'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Sparkles, Play, Cpu, ChevronDown, ChevronRight } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  rolesAllowed: string[];
  sampleInput: unknown;
}

interface AgentResult {
  agentId: string;
  name: string;
  durationMs: number;
  output: unknown;
  reasoning: string[];
  confidence: number;
  usedTools: string[];
  modelVersion?: string;
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [input, setInput] = useState<string>('{}');
  const [result, setResult] = useState<AgentResult | null>(null);
  const [running, setRunning] = useState(false);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    api<{ items: Agent[] }>('/ai/agents').then((d) => {
      setAgents(d.items);
      if (d.items.length) {
        setSelected(d.items[0]);
        setInput(JSON.stringify(d.items[0].sampleInput, null, 2));
      }
    });
  }, []);

  function selectAgent(a: Agent) {
    setSelected(a);
    setInput(JSON.stringify(a.sampleInput, null, 2));
    setResult(null);
  }

  async function run() {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    try {
      const parsed = JSON.parse(input || '{}');
      const r = await api<AgentResult>(`/ai/agents/${selected.id}/run`, {
        method: 'POST',
        body: JSON.stringify({ input: parsed }),
      });
      setResult(r);
    } catch (err: any) {
      setResult({
        agentId: selected.id,
        name: selected.name,
        durationMs: 0,
        output: { error: err?.message ?? String(err) },
        reasoning: ['Invocation failed'],
        confidence: 0,
        usedTools: [],
      });
    } finally {
      setRunning(false);
    }
  }

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center gap-2">
        <Cpu className="h-6 w-6 text-brand-500" />
        <div>
          <h1 className="text-2xl font-semibold">AI Agents</h1>
          <p className="text-sm text-gray-500">{agents.length} agents registered · run any agent with custom input</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[360px_1fr]">
        <aside className="space-y-2">
          {agents.map((a) => (
            <button
              key={a.id}
              onClick={() => selectAgent(a)}
              className={`w-full rounded-2xl border p-3 text-left transition ${
                selected?.id === a.id ? 'border-brand-400 bg-brand-50' : 'border-gray-200 bg-white hover:border-brand-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold">{a.name}</div>
                <Sparkles className="h-4 w-4 text-brand-500" />
              </div>
              <div className="mt-1 line-clamp-2 text-xs text-gray-600">{a.description}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {a.capabilities.slice(0, 2).map((c) => (
                  <span key={c} className="badge bg-gray-100 text-[10px]">{c}</span>
                ))}
              </div>
            </button>
          ))}
        </aside>

        <div className="space-y-4">
          {selected && (
            <>
              <div className="card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-gray-500">Selected agent</div>
                    <h2 className="text-xl font-semibold">{selected.name}</h2>
                    <p className="mt-1 text-sm text-gray-600">{selected.description}</p>
                  </div>
                  <button onClick={run} disabled={running} className="btn btn-primary">
                    <Play className="h-4 w-4" /> {running ? 'Running…' : 'Run agent'}
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {selected.capabilities.map((c) => (
                    <span key={c} className="badge-teal">{c}</span>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selected.rolesAllowed.map((r) => (
                    <span key={r} className="badge bg-gray-100">{r}</span>
                  ))}
                </div>
              </div>

              <div className="card">
                <div className="text-xs uppercase tracking-wider text-gray-500">Input (JSON)</div>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={12}
                  className="input mt-2 font-mono text-xs"
                  spellCheck={false}
                />
              </div>

              {result && (
                <div className="card">
                  <div className="flex items-center justify-between">
                    <div className="text-xs uppercase tracking-wider text-gray-500">Result</div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span>{result.durationMs}ms</span>
                      <span>·</span>
                      <span>confidence {(result.confidence * 100).toFixed(0)}%</span>
                      {result.modelVersion && (
                        <>
                          <span>·</span>
                          <span>{result.modelVersion}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {result.reasoning.length > 0 && (
                    <div className="mt-3">
                      <div className="text-[11px] uppercase tracking-wider text-gray-500">Reasoning</div>
                      <ul className="mt-1 list-disc pl-5 text-sm text-gray-700">
                        {result.reasoning.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                  {result.usedTools.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {result.usedTools.map((t) => <span key={t} className="badge-forest">{t}</span>)}
                    </div>
                  )}
                  <button
                    onClick={() => toggle(result.agentId)}
                    className="mt-4 flex items-center gap-1 text-sm text-brand-600 hover:underline"
                  >
                    {openIds.has(result.agentId) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    {openIds.has(result.agentId) ? 'Hide raw output' : 'Show raw output'}
                  </button>
                  {openIds.has(result.agentId) && (
                    <pre className="mt-2 max-h-96 overflow-auto rounded-xl bg-gray-900 p-3 text-xs text-emerald-300">
{JSON.stringify(result.output, null, 2)}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

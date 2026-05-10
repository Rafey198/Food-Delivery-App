/**
 * Base contract every AI agent in the platform implements.
 *
 * An "agent" is more than a function: it is a self-describing,
 * tool-using, multi-turn-capable component that an operator can
 * invoke from the admin playground and that other parts of the
 * platform call programmatically.
 *
 * Each agent exposes:
 *   - id, name, description, capabilities
 *   - which user roles can run it
 *   - a sample input so the admin playground can prefill it
 *   - a run() method that returns a structured result with
 *     `output`, `reasoning[]`, `confidence`, and `usedTools[]`
 */
export type AgentRole = 'CUSTOMER' | 'MERCHANT' | 'COURIER' | 'ADMIN' | 'SYSTEM';

export interface AgentResult<T = unknown> {
  output: T;
  reasoning: string[];
  confidence: number;
  usedTools: string[];
  modelVersion?: string;
}

export interface AgentDefinition<I = unknown, O = unknown> {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  rolesAllowed: AgentRole[];
  sampleInput: I;
  run(input: I, ctx?: AgentContext): Promise<AgentResult<O>>;
}

export interface AgentContext {
  prisma?: unknown;
  userId?: string;
  userRole?: AgentRole;
  now?: Date;
}

const registry = new Map<string, AgentDefinition>();

export function registerAgent(agent: AgentDefinition) {
  registry.set(agent.id, agent);
}

export function listAgents(): AgentDefinition[] {
  return [...registry.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function getAgent(id: string): AgentDefinition | undefined {
  return registry.get(id);
}

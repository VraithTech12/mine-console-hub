import { supabase } from "@/integrations/supabase/client";
import { friendlyError } from "./protocol";

export interface AgentRow {
  id: string;
  user_id: string;
  agent_key: string;
  name: string;
  platform: string | null;
  connection_state: string;
  last_seen: string | null;
  actions: string[];
  status: Record<string, unknown>;
  created_at: string;
}

export class AgentActionError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(friendlyError(code, message));
    this.code = code;
    this.name = "AgentActionError";
  }
}

/** True when the agent has checked in recently enough to be considered live. */
export function isLive(agent: Pick<AgentRow, "connection_state" | "last_seen">): boolean {
  if (agent.connection_state !== "connected") return false;
  if (!agent.last_seen) return false;
  return Date.now() - new Date(agent.last_seen).getTime() < 90_000;
}

/**
 * Queue a request for the agent and wait for the matching response.
 * The relay sends { id, action, payload } and matches the agent's reply by id.
 */
export async function runAction<T = unknown>(
  agent: Pick<AgentRow, "id" | "user_id" | "connection_state" | "last_seen">,
  action: string,
  payload: Record<string, unknown> = {},
  timeoutMs = 60_000,
): Promise<T> {
  if (!isLive(agent)) throw new AgentActionError("OFFLINE");

  const { data: row, error } = await supabase
    .from("agent_commands")
    .insert({ agent_id: agent.id, user_id: agent.user_id, action, payload: payload as never })
    .select("id")
    .single();

  if (error || !row) throw new AgentActionError("ACTION_FAILED", error?.message);

  const started = Date.now();
  let delay = 300;
  while (Date.now() - started < timeoutMs) {
    await new Promise((r) => setTimeout(r, delay));
    delay = Math.min(delay + 100, 1200);

    const { data } = await supabase
      .from("agent_commands")
      .select("state, ok, data, error")
      .eq("id", row.id)
      .maybeSingle();

    if (!data) continue;
    if (data.state === "done") {
      if (data.ok) return data.data as T;
      const err = (data.error ?? {}) as { code?: string; message?: string };
      throw new AgentActionError(err.code ?? "ACTION_FAILED", err.message);
    }
  }

  await supabase
    .from("agent_commands")
    .update({ state: "done", ok: false, error: { code: "TIMEOUT", message: "No response" } })
    .eq("id", row.id);
  throw new AgentActionError("TIMEOUT");
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

export function formatWhen(input: string | number | null | undefined): string {
  if (!input) return "never";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} h ago`;
  return date.toLocaleString();
}

export function formatUptime(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${m}m ${Math.floor(seconds % 60)}s`;
}

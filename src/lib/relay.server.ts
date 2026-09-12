import { hashToken } from "./agent-auth.server";

/**
 * Outbound WebSocket relay — PROTOCOL.md section 2.
 *
 * The agent dials out to wss://<host>/agent with:
 *   Authorization: Bearer <agentToken>
 *   x-agent-id / x-agent-name / x-agent-protocol
 *
 * Bad credentials are rejected by closing with 4001 / 4003 so the agent wipes
 * its token and returns to the unpaired state.
 */

type Sock = {
  accept?: () => void;
  send: (data: string) => void;
  close: (code?: number, reason?: string) => void;
  addEventListener: (type: string, cb: (event: never) => void) => void;
  readyState: number;
};

interface AgentMessage {
  type?: string;
  agentName?: string;
  protocolVersion?: number;
  actions?: unknown;
  status?: unknown;
  event?: string;
  data?: { line?: unknown; [key: string]: unknown };
  ts?: number;
  id?: string;
  ok?: boolean;
  error?: unknown;
}

const POLL_MS = 400;
const CONSOLE_RETENTION_HOURS = 12;

export async function handleRelaySession(socket: Sock, request: Request): Promise<void> {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.toLowerCase().startsWith("bearer ") ? auth.slice(7).trim() : "";
  const agentKeyHeader = request.headers.get("x-agent-id") ?? "";
  const agentNameHeader = request.headers.get("x-agent-name") ?? "";

  if (!token || !agentKeyHeader) {
    socket.close(4001, "Missing credentials");
    return;
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: agent } = await supabaseAdmin
    .from("agents")
    .select("id, user_id, token_hash, name")
    .eq("agent_key", agentKeyHeader)
    .maybeSingle();

  if (!agent) {
    socket.close(4001, "Unknown agent");
    return;
  }
  if (agent.token_hash !== (await hashToken(token))) {
    socket.close(4003, "Invalid credentials");
    return;
  }

  const agentId = agent.id as string;
  const userId = agent.user_id as string;
  let open = true;

  const patch = (values: Record<string, unknown>) =>
    supabaseAdmin
      .from("agents")
      .update(values as never)
      .eq("id", agentId);

  await patch({
    connection_state: "connected",
    last_seen: new Date().toISOString(),
    ...(agentNameHeader ? { name: agentNameHeader } : {}),
  });

  const send = (frame: unknown) => {
    try {
      socket.send(JSON.stringify(frame));
    } catch {
      /* socket already gone */
    }
  };

  socket.addEventListener("message", ((event: { data: unknown }) => {
    void onMessage(typeof event.data === "string" ? event.data : String(event.data));
  }) as never);

  const finish = () => {
    if (!open) return;
    open = false;
    void patch({ connection_state: "offline", last_seen: new Date().toISOString() });
  };

  socket.addEventListener("close", (() => finish()) as never);
  socket.addEventListener("error", (() => finish()) as never);

  async function onMessage(raw: string) {
    let msg: AgentMessage;
    try {
      msg = JSON.parse(raw) as AgentMessage;
    } catch {
      return;
    }

    const type = typeof msg.type === "string" ? msg.type : undefined;

    if (type === "ping") {
      send({ type: "pong" });
      await patch({ last_seen: new Date().toISOString(), connection_state: "connected" });
      return;
    }

    if (type === "hello") {
      await patch({
        connection_state: "connected",
        last_seen: new Date().toISOString(),
        name: typeof msg.agentName === "string" && msg.agentName ? msg.agentName : agent!.name,
        protocol_version: Number(msg.protocolVersion ?? 1) || 1,
        actions: Array.isArray(msg.actions) ? msg.actions : [],
        status: (msg.status as Record<string, unknown>) ?? {},
      });
      return;
    }

    if (type === "event") {
      const event = typeof msg.event === "string" ? msg.event : "";
      const data = msg.data as Record<string, unknown> | undefined;
      if (event === "server.status" && data) {
        await patch({ status: data, last_seen: new Date().toISOString() });
      } else if (event === "console.line") {
        const line = typeof data?.["line"] === "string" ? (data["line"] as string) : "";
        if (line) {
          await supabaseAdmin.from("console_lines").insert({
            agent_id: agentId,
            user_id: userId,
            line,
            ts: new Date(typeof msg.ts === "number" ? msg.ts : Date.now()).toISOString(),
          });
        }
      }
      return;
    }

    // Response to one of our requests, matched by id.
    if (typeof msg.id === "string") {
      await supabaseAdmin
        .from("agent_commands")
        .update({
          state: "done",
          ok: msg.ok === true,
          data: msg.ok === true ? ((msg.data ?? null) as never) : null,
          error: msg.ok === true ? null : ((msg.error ?? null) as never),
        })
        .eq("id", msg.id)
        .eq("agent_id", agentId);
    }
  }

  // Deliver queued requests. The website never blasts the agent: one small
  // poll per 400ms, and requests are only created by explicit user actions.
  let ticks = 0;
  while (open && socket.readyState === 1) {
    const { data: pending } = await supabaseAdmin
      .from("agent_commands")
      .select("id, action, payload")
      .eq("agent_id", agentId)
      .eq("state", "pending")
      .order("created_at", { ascending: true })
      .limit(5);

    if (pending && pending.length > 0) {
      for (const cmd of pending) {
        const { data: claimed } = await supabaseAdmin
          .from("agent_commands")
          .update({ state: "sent" })
          .eq("id", cmd.id)
          .eq("state", "pending")
          .select("id")
          .maybeSingle();
        if (claimed) {
          send({ id: cmd.id, action: cmd.action, payload: cmd.payload ?? {} });
        }
      }
    }

    ticks += 1;
    if (ticks % 150 === 0) {
      await patch({ last_seen: new Date().toISOString() });
    }
    if (ticks % 1500 === 0) {
      const cutoff = new Date(Date.now() - CONSOLE_RETENTION_HOURS * 3600_000).toISOString();
      await supabaseAdmin.from("console_lines").delete().eq("agent_id", agentId).lt("ts", cutoff);
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }

  finish();
}

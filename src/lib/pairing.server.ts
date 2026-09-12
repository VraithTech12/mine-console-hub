import { agentKey, generatePairingCode, hashToken, randomToken } from "./agent-auth.server";

export const PAIRING_CODE_TTL_MINUTES = 10;

interface PairBody {
  pairingCode?: unknown;
  agentName?: unknown;
  installId?: unknown;
  platform?: unknown;
  protocolVersion?: unknown;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * POST /api/agent/pair — PROTOCOL.md section 1.
 * Validates a single-use pairing code and returns { agentId, agentToken, relayUrl }.
 */
export async function handlePairRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (forwardedProto !== "https" && !isLocal) {
    return json({ error: "HTTPS is required for pairing." }, 400);
  }

  let body: PairBody;
  try {
    body = (await request.json()) as PairBody;
  } catch {
    return json({ error: "Invalid JSON body." }, 400);
  }

  const pairingCode = typeof body.pairingCode === "string" ? body.pairingCode.trim().toUpperCase() : "";
  const agentName = typeof body.agentName === "string" && body.agentName.trim() ? body.agentName.trim() : "Minecraft Agent";
  const installId = typeof body.installId === "string" ? body.installId : null;
  const platform = typeof body.platform === "string" ? body.platform : null;
  const protocolVersion = Number(body.protocolVersion ?? 1) || 1;

  if (!/^[A-Z]{4}-[0-9]{4}$/.test(pairingCode)) {
    return json({ error: "Pairing code must look like ABCD-1234." }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: codeRow } = await supabaseAdmin
    .from("pairing_codes")
    .select("id, user_id, expires_at, used_at")
    .eq("code", pairingCode)
    .maybeSingle();

  if (!codeRow) return json({ error: "Unknown pairing code." }, 404);
  if (codeRow.used_at) return json({ error: "This pairing code has already been used." }, 409);
  if (new Date(codeRow.expires_at).getTime() < Date.now()) {
    return json({ error: "This pairing code has expired. Generate a new one." }, 410);
  }

  const token = randomToken(32);
  const key = agentKey();

  const { data: agent, error: agentError } = await supabaseAdmin
    .from("agents")
    .insert({
      user_id: codeRow.user_id,
      agent_key: key,
      name: agentName,
      platform,
      install_id: installId,
      protocol_version: protocolVersion,
      token_hash: await hashToken(token),
      connection_state: "offline",
    })
    .select("id, agent_key")
    .single();

  if (agentError || !agent) {
    return json({ error: "Could not register this agent." }, 500);
  }

  // Single use: burn the code immediately.
  const { error: burnError } = await supabaseAdmin
    .from("pairing_codes")
    .update({ used_at: new Date().toISOString(), agent_id: agent.id })
    .eq("id", codeRow.id)
    .is("used_at", null);

  if (burnError) {
    await supabaseAdmin.from("agents").delete().eq("id", agent.id);
    return json({ error: "This pairing code has already been used." }, 409);
  }

  const host = request.headers.get("x-forwarded-host") ?? url.host;
  return json(
    {
      agentId: agent.agent_key,
      agentToken: token,
      relayUrl: `${isLocal ? "ws" : "wss"}://${host}/api/public/agent/relay`,
    },
    200,
  );
}

export { generatePairingCode };

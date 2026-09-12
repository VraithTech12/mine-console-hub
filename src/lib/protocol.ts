/**
 * Agent <-> Website protocol (v1) — shared types.
 * Mirrors PROTOCOL.md exactly. Do not rename fields.
 */

export const PROTOCOL_VERSION = 1;

export type ServerState =
  | "offline"
  | "starting"
  | "online"
  | "stopping"
  | "restarting"
  | "error";

export interface ServerStatus {
  state: ServerState;
  pid: number | null;
  uptimeSeconds: number;
  cpuPercent: number | null;
  memoryMb: number | null;
  players: number | null;
  maxPlayers: number | null;
  lastError: string | null;
  playerList?: string[];
}

export interface FileEntry {
  name: string;
  path: string;
  type: "file" | "directory";
  size: number;
  modified: number;
}

export interface BackupEntry {
  name: string;
  path: string;
  size: number;
  created: number;
}

export type AgentErrorCode =
  | "UNKNOWN_ACTION"
  | "INVALID_INPUT"
  | "RATE_LIMITED"
  | "ACTION_FAILED"
  | "TIMEOUT"
  | "OFFLINE";

export interface AgentRequestFrame {
  id: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface AgentResponseFrame {
  id: string;
  ok: boolean;
  data?: unknown;
  error?: { code: string; message: string };
}

export const EMPTY_STATUS: ServerStatus = {
  state: "offline",
  pid: null,
  uptimeSeconds: 0,
  cpuPercent: null,
  memoryMb: null,
  players: null,
  maxPlayers: null,
  lastError: null,
  playerList: [],
};

export function friendlyError(code: string | undefined, message?: string): string {
  switch (code) {
    case "RATE_LIMITED":
      return "The agent is rate limiting this action. Wait a moment and try again.";
    case "UNKNOWN_ACTION":
      return "This agent doesn't support that action.";
    case "INVALID_INPUT":
      return message || "The agent rejected the input.";
    case "TIMEOUT":
      return "The agent didn't answer in time. It may be offline or busy.";
    case "OFFLINE":
      return "The agent is not connected right now.";
    case "ACTION_FAILED":
    default:
      return message || "The agent could not complete that action.";
  }
}

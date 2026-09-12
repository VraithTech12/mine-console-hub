import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Copy, Search, SendHorizontal, TerminalSquare } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { runAction, isLive, type AgentRow } from "@/lib/agent-client";

interface Line {
  id: number;
  line: string;
  ts: string;
}

function toneOf(line: string) {
  const upper = line.toUpperCase();
  if (upper.includes("ERROR") || upper.includes("SEVERE")) return "text-console-error";
  if (upper.includes("WARN")) return "text-console-warn";
  if (upper.includes("JOINED THE GAME") || upper.includes("DONE (")) return "text-primary";
  return "text-muted-foreground";
}

export function ConsolePanel({ agent }: { agent: AgentRow }) {
  const [command, setCommand] = useState("");
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const boxRef = useRef<HTMLDivElement>(null);

  const lines = useQuery({
    queryKey: ["console", agent.id],
    refetchInterval: 2000,
    queryFn: async (): Promise<Line[]> => {
      const { data, error } = await supabase
        .from("console_lines")
        .select("id, line, ts")
        .eq("agent_id", agent.id)
        .order("id", { ascending: false })
        .limit(300);
      if (error) throw new Error(error.message);
      return (data ?? []).reverse();
    },
  });

  const visible = useMemo(() => {
    const all = lines.data ?? [];
    const needle = filter.trim().toLowerCase();
    return needle ? all.filter((l) => l.line.toLowerCase().includes(needle)) : all;
  }, [lines.data, filter]);

  useEffect(() => {
    const box = boxRef.current;
    if (box && autoScroll) box.scrollTop = box.scrollHeight;
  }, [visible, autoScroll]);

  const send = useMutation({
    mutationFn: (value: string) => runAction(agent, "server.command", { command: value }),
    onSuccess: (_d, value) => {
      setHistory((h) => [value, ...h.filter((x) => x !== value)].slice(0, 40));
      setHistoryIndex(-1);
      setCommand("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const live = isLive(agent);

  return (
    <section className="panel flex flex-col p-4 sm:p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <TerminalSquare className="size-4 shrink-0 text-chat" />
          <h2 className="truncate text-sm font-semibold">Server console</h2>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant={autoScroll ? "secondary" : "ghost"}
            size="sm"
            title="Follow new output"
            onClick={() => setAutoScroll((v) => !v)}
          >
            <ArrowDownToLine className="size-4" />
            <span className="hidden sm:inline">Follow</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            title="Copy visible output"
            onClick={() => {
              void navigator.clipboard.writeText(visible.map((l) => l.line).join("\n"));
              toast.success("Console text copied.");
            }}
          >
            <Copy className="size-4" />
          </Button>
        </div>
      </header>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search output…"
          className="pl-9"
        />
      </div>

      <div
        ref={boxRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          if (atBottom !== autoScroll) setAutoScroll(atBottom);
        }}
        className="mt-3 h-64 overflow-y-auto overscroll-contain rounded-lg border border-border bg-background/70 p-3 font-mono text-[11px] leading-relaxed sm:h-80 sm:text-xs"
      >
        {visible.length > 0 ? (
          visible.map((entry) => (
            <p key={entry.id} className={`break-words ${toneOf(entry.line)}`}>
              {entry.line}
            </p>
          ))
        ) : (
          <p className="text-muted-foreground">
            {filter
              ? "Nothing matches that search."
              : "No output yet. Console lines appear here once the server is running."}
          </p>
        )}
      </div>

      <form
        className="mt-3 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          const value = command.trim();
          if (value) send.mutate(value);
        }}
      >
        <Input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" && history.length) {
              e.preventDefault();
              const next = Math.min(historyIndex + 1, history.length - 1);
              setHistoryIndex(next);
              setCommand(history[next] ?? "");
            }
            if (e.key === "ArrowDown" && historyIndex >= 0) {
              e.preventDefault();
              const next = historyIndex - 1;
              setHistoryIndex(next);
              setCommand(next < 0 ? "" : (history[next] ?? ""));
            }
          }}
          placeholder={live ? "say hello, time set day, op PlayerName…" : "Helper offline"}
          disabled={!live || send.isPending}
          className="font-mono"
        />
        <Button
          type="submit"
          className="sm:w-auto"
          disabled={!live || send.isPending || !command.trim()}
        >
          <SendHorizontal className="size-4" />
          Send
        </Button>
      </form>
    </section>
  );
}

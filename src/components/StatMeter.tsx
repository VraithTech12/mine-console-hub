import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** A single metric tile with an optional fill bar underneath the value. */
export function StatMeter({
  icon: Icon,
  label,
  value,
  hint,
  percent,
  tone = "primary",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string | undefined;
  percent?: number | null;
  tone?: "primary" | "chat" | "warning";
}) {
  const clamped =
    percent === null || percent === undefined ? null : Math.max(0, Math.min(100, percent));

  const bar =
    tone === "chat" ? "bg-chat" : tone === "warning" ? "bg-warning" : "bg-primary";

  return (
    <div className="group relative overflow-hidden rounded-xl border border-border bg-surface-2/50 p-3 transition-colors hover:border-primary/40 sm:p-4">
      <div className="flex min-w-0 items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:text-xs">
        <Icon className="size-3.5 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 font-mono text-xl tabular-nums text-foreground sm:text-2xl">{value}</p>
      {hint && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p>}
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-background/70">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", bar)}
          style={{ width: `${clamped ?? 0}%`, opacity: clamped === null ? 0.25 : 1 }}
        />
      </div>
    </div>
  );
}

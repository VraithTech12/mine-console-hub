import { cn } from "@/lib/utils";

export type DotState = "connected" | "connecting" | "offline";

const styles: Record<DotState, { dot: string; ring: string; label: string }> = {
  connected: { dot: "bg-success", ring: "bg-success/30", label: "Connected" },
  connecting: { dot: "bg-warning", ring: "bg-warning/30", label: "Connecting" },
  offline: { dot: "bg-destructive", ring: "bg-destructive/30", label: "Offline" },
};

export function StatusDot({
  state,
  label,
  className,
}: {
  state: DotState;
  label?: string;
  className?: string;
}) {
  const s = styles[state];
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs font-medium", className)}>
      <span className="relative flex size-2.5">
        {state !== "offline" && (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full", s.ring)} />
        )}
        <span className={cn("relative inline-flex size-2.5 rounded-full", s.dot)} />
      </span>
      <span className="text-muted-foreground">{label ?? s.label}</span>
    </span>
  );
}

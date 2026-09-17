import type { LucideIcon } from "lucide-react";

export type NavItem = { value: string; label: string; icon: LucideIcon };

type Props = {
  items: NavItem[];
  value: string;
  onChange: (value: string) => void;
};

/** Pill navigation on wide screens, thumb-friendly bar at the bottom on phones. */
export function DashboardNav({ items, value, onChange }: Props) {
  return (
    <>
      <nav
        aria-label="Sections"
        className="hidden gap-1 rounded-2xl border border-border bg-surface/70 p-1 backdrop-blur-md sm:flex"
      >
        {items.map((item) => {
          const active = item.value === value;
          return (
            <button
              key={item.value}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => onChange(item.value)}
              className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/15 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.35)]"
                  : "text-muted-foreground hover:bg-surface-2/70 hover:text-foreground"
              }`}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 pb-[max(env(safe-area-inset-bottom),0.35rem)] backdrop-blur-md sm:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {items.map((item) => {
            const active = item.value === value;
            return (
              <button
                key={item.value}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onChange(item.value)}
                className={`flex flex-1 flex-col items-center gap-1 px-1 pb-1.5 pt-2 text-[11px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <span
                  className={`grid size-9 place-items-center rounded-xl transition-colors ${
                    active ? "bg-primary/15" : ""
                  }`}
                >
                  <item.icon className="size-[18px]" />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}

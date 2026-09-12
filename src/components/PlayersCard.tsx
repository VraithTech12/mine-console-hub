import { Users } from "lucide-react";

/** Who is online right now, with Minecraft head avatars. */
export function PlayersCard({
  players,
  max,
  list,
}: {
  players: number | null;
  max: number | null;
  list?: string[] | undefined;
}) {
  const names = list ?? [];

  return (
    <section className="panel p-4 sm:p-5">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Users className="size-4 shrink-0 text-primary" />
          <h2 className="truncate text-sm font-semibold">Online now</h2>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-surface-2 px-2.5 py-0.5 font-mono text-xs tabular-nums text-muted-foreground">
          {players ?? 0}
          {max ? `/${max}` : ""}
        </span>
      </header>

      {names.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {names.map((name) => (
            <li
              key={name}
              className="flex items-center gap-2.5 rounded-lg border border-border/70 bg-surface-2/50 px-2.5 py-2"
            >
              <img
                src={`https://mc-heads.net/avatar/${encodeURIComponent(name)}/32`}
                alt={`${name}'s Minecraft skin head`}
                width={28}
                height={28}
                loading="lazy"
                className="size-7 shrink-0 rounded-md border border-border"
              />
              <span className="min-w-0 truncate text-sm">{name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">Nobody is online right now.</p>
      )}
    </section>
  );
}

import { useMutation } from "@tanstack/react-query";
import { Copy, KeyRound, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const TTL_MINUTES = 10;

function makeCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "0123456789";
  const pick = (set: string, n: number) => {
    const arr = new Uint32Array(n);
    crypto.getRandomValues(arr);
    return Array.from(arr, (v) => set[v % set.length]).join("");
  };
  return `${pick(letters, 4)}-${pick(digits, 4)}`;
}

export function PairAgentCard({ userId, onPaired }: { userId: string; onPaired: () => void }) {
  const [code, setCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  useEffect(() => {
    if (!code) return;
    const id = setInterval(() => void onPaired(), 4000);
    return () => clearInterval(id);
  }, [code, onPaired]);

  const create = useMutation({
    mutationFn: async () => {
      const value = makeCode();
      const expires = new Date(Date.now() + TTL_MINUTES * 60_000);
      const { error } = await supabase
        .from("pairing_codes")
        .insert({ user_id: userId, code: value, expires_at: expires.toISOString() });
      if (error) throw new Error(error.message);
      return { value, expires: expires.getTime() };
    },
    onSuccess: ({ value, expires }) => {
      setCode(value);
      setExpiresAt(expires);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const expired = Boolean(expiresAt && secondsLeft <= 0);

  return (
    <section className="panel p-5">
      <header className="flex items-center gap-2">
        <KeyRound className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Connect your computer</h2>
      </header>
      <p className="mt-2 text-sm text-muted-foreground">
        Generate a one-time code, then type it into the helper app running on the computer that hosts
        your Minecraft server. The code works once and expires after {TTL_MINUTES} minutes.
      </p>

      {code && !expired ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="rounded-md border border-border bg-surface-2 px-4 py-2 font-mono text-2xl tracking-widest text-primary text-glow">
            {code}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(code);
              toast.success("Code copied");
            }}
          >
            <Copy className="size-4" /> Copy
          </Button>
          <span className="text-xs text-muted-foreground">
            Expires in {Math.floor(secondsLeft / 60)}:
            {String(secondsLeft % 60).padStart(2, "0")}
          </span>
        </div>
      ) : (
        <Button className="mt-4" onClick={() => create.mutate()} disabled={create.isPending}>
          {create.isPending && <Loader2 className="size-4 animate-spin" />}
          {expired ? "Generate a new code" : "Generate pairing code"}
        </Button>
      )}
    </section>
  );
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, Loader2, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Enrolling = { factorId: string; qr: string; secret: string };

/** Extra sign-in step using an authenticator app such as Microsoft Authenticator. */
export function TwoFactorCard() {
  const queryClient = useQueryClient();
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");

  const factors = useQuery({
    queryKey: ["mfa-factors"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw new Error(error.message);
      return data?.totp ?? [];
    },
  });

  const active = factors.data?.filter((f) => f.status === "verified") ?? [];

  const start = useMutation({
    mutationFn: async () => {
      // Clear any half-finished attempts so enrolling always works.
      for (const f of factors.data?.filter((x) => x.status !== "verified") ?? []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${new Date().toLocaleDateString()}`,
      });
      if (error) throw new Error(error.message);
      return {
        factorId: data.id,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
      } satisfies Enrolling;
    },
    onSuccess: (data) => setEnrolling(data),
    onError: (error: Error) => toast.error(error.message),
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!enrolling) return;
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: enrolling.factorId,
        code: code.replace(/\s/g, ""),
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEnrolling(null);
      setCode("");
      toast.success("Two-step sign-in is on.");
      void queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
    },
    onError: () => toast.error("That code didn’t work. Try the newest one."),
  });

  const remove = useMutation({
    mutationFn: async (factorId: string) => {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Two-step sign-in turned off.");
      void queryClient.invalidateQueries({ queryKey: ["mfa-factors"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="panel min-w-0 overflow-hidden">
      <header className="flex items-center gap-2 border-b border-border/70 bg-surface-2/40 p-4 sm:p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">Two-step sign-in</h2>
          <p className="truncate text-xs text-muted-foreground">
            Ask for a code from your phone as well as your password.
          </p>
        </div>
        <span
          className={`ml-auto shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            active.length
              ? "border-success/40 bg-success/15 text-success"
              : "border-border bg-surface-2 text-muted-foreground"
          }`}
        >
          {factors.isLoading ? "…" : active.length ? "On" : "Off"}
        </span>
      </header>

      <div className="space-y-4 p-4 sm:p-5">
        {active.length > 0 && !enrolling && (
          <div className="space-y-2">
            {active.map((f) => (
              <div
                key={f.id}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface-2/50 p-3.5"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background text-primary">
                  <Smartphone className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{f.friendly_name ?? "Authenticator app"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    Added {new Date(f.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-destructive"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(f.id)}
                  aria-label="Turn off two-step sign-in"
                >
                  {remove.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {enrolling ? (
          <div className="space-y-4">
            <ol className="space-y-1.5 text-sm leading-6 text-muted-foreground">
              <li>1. Open Microsoft Authenticator (or any authenticator app).</li>
              <li>2. Add an account and scan this square.</li>
              <li>3. Type the 6-digit code it shows.</li>
            </ol>
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background/60 p-4">
              <img
                src={enrolling.qr}
                alt="Square to scan with your authenticator app"
                className="size-40 rounded-xl bg-white p-2"
              />
              <button
                type="button"
                className="inline-flex max-w-full items-center gap-2 truncate rounded-lg border border-border bg-surface-2 px-3 py-1.5 text-xs text-muted-foreground"
                onClick={() => {
                  void navigator.clipboard.writeText(enrolling.secret);
                  toast.success("Setup key copied.");
                }}
              >
                <Copy className="size-3.5 shrink-0" />
                <span className="truncate">{enrolling.secret}</span>
              </button>
              <p className="text-center text-xs text-muted-foreground">
                Can’t scan? Type that key into the app instead.
              </p>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                confirm.mutate();
              }}
            >
              <Label htmlFor="mfa-code">6-digit code</Label>
              <Input
                id="mfa-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={7}
                className="h-12 text-center text-lg tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="submit"
                  className="h-11 flex-1"
                  disabled={confirm.isPending || code.replace(/\s/g, "").length < 6}
                >
                  {confirm.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  Turn on
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11"
                  onClick={() => {
                    void supabase.auth.mfa.unenroll({ factorId: enrolling.factorId });
                    setEnrolling(null);
                    setCode("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        ) : (
          active.length === 0 && (
            <>
              <p className="text-sm leading-6 text-muted-foreground">
                With this on, signing in also asks for a code from your phone, so your password
                alone isn’t enough.
              </p>
              <Button
                className="h-11 w-full sm:w-auto"
                disabled={start.isPending || factors.isLoading}
                onClick={() => start.mutate()}
              >
                {start.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Smartphone className="size-4" />
                )}
                Set up with an authenticator app
              </Button>
            </>
          )
        )}
      </div>
    </section>
  );
}

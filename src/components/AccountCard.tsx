import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Check, KeyRound, Link2, Loader2, ShieldCheck, Unlink, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinecraftAvatar } from "@/components/MinecraftAvatar";

/** Supabase stores the Microsoft provider under this name. */
const MICROSOFT = "azure";

function MicrosoftMark() {
  return (
    <svg viewBox="0 0 23 23" className="size-4" aria-hidden>
      <path fill="#f35325" d="M1 1h10v10H1z" />
      <path fill="#81bc06" d="M12 1h10v10H12z" />
      <path fill="#05a6f0" d="M1 12h10v10H1z" />
      <path fill="#ffba08" d="M12 12h10v10H12z" />
    </svg>
  );
}

/** Best guess at the person's Microsoft display name. */
function microsoftName(data: Record<string, unknown> | null | undefined): string | null {
  if (!data) return null;
  const keys = ["preferred_username", "name", "full_name", "user_name", "email"];
  for (const key of keys) {
    const value = data[key];
    if (typeof value === "string" && value.trim()) {
      const clean = value.includes("@") ? value.split("@")[0]! : value;
      return clean.trim();
    }
  }
  return null;
}

type Props = {
  email: string | null | undefined;
  minecraftUsername: string | null;
  saving: boolean;
  onSaveName: (name: string | null) => Promise<void>;
};

/** Personal account settings: email, password and connected sign-in methods. */
export function AccountCard({ email, minecraftUsername, saving, onSaveName }: Props) {
  const queryClient = useQueryClient();
  const [newEmail, setNewEmail] = useState(email ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const identities = useQuery({
    queryKey: ["identities"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUserIdentities();
      if (error) throw new Error(error.message);
      return data?.identities ?? [];
    },
  });

  const microsoft = identities.data?.find((i) => i.provider === MICROSOFT);
  const msName = microsoftName(microsoft?.identity_data as Record<string, unknown> | undefined);
  const msEmail =
    (microsoft?.identity_data?.["email"] as string | undefined) ??
    (microsoft?.identity_data?.["preferred_username"] as string | undefined) ??
    null;

  const changeEmail = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.auth.updateUser(
        { email: value },
        { emailRedirectTo: window.location.origin },
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Check your new inbox for a confirmation link."),
    onError: (error: Error) => toast.error(error.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
        ...(currentPassword ? { current_password: currentPassword } : {}),
      } as Parameters<typeof supabase.auth.updateUser>[0]);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password updated.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const linkMicrosoft = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.linkIdentity({
        provider: MICROSOFT,
        options: { redirectTo: `${window.location.origin}/dashboard` },
      });
      if (error) throw new Error(error.message);
    },
    onError: (error: Error) =>
      toast.error(
        /not enabled|Unsupported/i.test(error.message)
          ? "Microsoft sign-in isn’t available on this account yet."
          : error.message,
      ),
  });

  const unlinkMicrosoft = useMutation({
    mutationFn: async () => {
      if (!microsoft) return;
      if ((identities.data?.length ?? 0) < 2)
        throw new Error("Add another way to sign in before removing this one.");
      const { error } = await supabase.auth.unlinkIdentity(microsoft);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Microsoft account disconnected.");
      void queryClient.invalidateQueries({ queryKey: ["identities"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const passwordsMatch = newPassword.length >= 8 && newPassword === confirmPassword;
  const canUseMsName = Boolean(msName) && msName !== minecraftUsername;

  // First time a Microsoft account is linked, use its name for the avatar head.
  const adopted = useRef(false);
  useEffect(() => {
    if (adopted.current || saving || minecraftUsername || !msName) return;
    adopted.current = true;
    void onSaveName(msName).catch(() => {
      adopted.current = false;
    });
  }, [msName, minecraftUsername, saving, onSaveName]);

  return (
    <section className="panel min-w-0 overflow-hidden lg:col-span-2">
      <header className="flex items-center gap-2 border-b border-border/70 bg-surface-2/40 p-4 sm:p-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">Your account</h2>
          <p className="truncate text-xs text-muted-foreground">
            Change how you sign in to Aether.
          </p>
        </div>
      </header>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0 space-y-5">
          {/* Email */}
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const value = newEmail.trim();
              if (value && value !== email) changeEmail.mutate(value);
            }}
          >
            <Label htmlFor="account-email" className="flex items-center gap-1.5">
              <AtSign className="size-3.5 text-muted-foreground" />
              Email address
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="account-email"
                type="email"
                className="h-11"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
              <Button
                type="submit"
                variant="secondary"
                className="h-11 shrink-0"
                disabled={changeEmail.isPending || !newEmail.trim() || newEmail.trim() === email}
              >
                {changeEmail.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                Update
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We’ll email the new address to confirm the change.
            </p>
          </form>

          {/* Password */}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (passwordsMatch) changePassword.mutate();
            }}
          >
            <Label className="flex items-center gap-1.5">
              <KeyRound className="size-3.5 text-muted-foreground" />
              Password
            </Label>
            <Input
              type="password"
              autoComplete="current-password"
              placeholder="Current password"
              className="h-11"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="New password"
                minLength={8}
                className="h-11"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <Input
                type="password"
                autoComplete="new-password"
                placeholder="Repeat new password"
                minLength={8}
                className="h-11"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Those passwords don’t match.</p>
            )}
            <Button
              type="submit"
              className="h-11 w-full sm:w-auto"
              disabled={changePassword.isPending || !passwordsMatch}
            >
              {changePassword.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <KeyRound className="size-4" />
              )}
              Change password
            </Button>
          </form>
        </div>

        {/* Connected sign-in methods */}
        <div className="min-w-0 space-y-3">
          <Label className="flex items-center gap-1.5">
            <Link2 className="size-3.5 text-muted-foreground" />
            Connected sign-in
          </Label>
          <div className="rounded-2xl border border-border bg-surface-2/50 p-3.5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-background">
                <MicrosoftMark />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Microsoft account</p>
                <p className="truncate text-xs text-muted-foreground">
                  {identities.isLoading
                    ? "Checking…"
                    : microsoft
                      ? (msEmail ?? "Connected — you can sign in with Microsoft.")
                      : "Not connected yet."}
                </p>
                {microsoft && msName && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    Name on file: <span className="text-foreground">{msName}</span>
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              {microsoft ? (
                <Button
                  variant="secondary"
                  className="h-10 w-full sm:w-auto"
                  disabled={unlinkMicrosoft.isPending}
                  onClick={() => unlinkMicrosoft.mutate()}
                >
                  {unlinkMicrosoft.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Unlink className="size-4" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="secondary"
                  className="h-10 w-full sm:w-auto"
                  disabled={linkMicrosoft.isPending || identities.isLoading}
                  onClick={() => linkMicrosoft.mutate()}
                >
                  {linkMicrosoft.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Link2 className="size-4" />
                  )}
                  Connect
                </Button>
              )}
            </div>

            {microsoft && msName && (
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                <MinecraftAvatar username={msName} size={40} className="rounded-lg" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">Use “{msName}” as your avatar</p>
                  <p className="truncate text-xs text-muted-foreground">
                    We’ll look up that character’s head.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-9 shrink-0"
                  disabled={saving || !canUseMsName}
                  onClick={() => {
                    void (async () => {
                      try {
                        await onSaveName(msName);
                        toast.success("Avatar updated from your Microsoft name.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error ? error.message : "Could not save that.",
                        );
                      }
                    })();
                  }}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Wand2 className="size-4" />}
                  {canUseMsName ? "Use" : "In use"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

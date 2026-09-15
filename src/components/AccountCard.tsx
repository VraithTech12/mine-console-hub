import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Check, KeyRound, Link2, Loader2, ShieldCheck, Unlink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

/** Personal account settings: email, password and connected sign-in methods. */
export function AccountCard({ email }: { email: string | null | undefined }) {
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
        // Lovable Cloud may require the current password for signed-in changes.
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
        error.message.includes("not enabled")
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

  return (
    <section className="panel min-w-0 p-4 sm:p-5">
      <header className="flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <h2 className="text-base font-semibold">Your account</h2>
      </header>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Change how you sign in to Aether.
      </p>

      {/* Email */}
      <form
        className="mt-5 space-y-2"
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
            {changeEmail.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Update
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          We’ll email the new address to confirm the change.
        </p>
      </form>

      <div className="my-5 h-px bg-border" />

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

      <div className="my-5 h-px bg-border" />

      {/* Connected sign-in methods */}
      <div className="space-y-3">
        <Label className="flex items-center gap-1.5">
          <Link2 className="size-3.5 text-muted-foreground" />
          Connected sign-in
        </Label>
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-2/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <MicrosoftMark />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">Microsoft account</p>
              <p className="truncate text-xs text-muted-foreground">
                {identities.isLoading
                  ? "Checking…"
                  : microsoft
                    ? "Connected — you can sign in with Microsoft."
                    : "Not connected yet."}
              </p>
            </div>
          </div>
          {microsoft ? (
            <Button
              variant="secondary"
              className="h-10 w-full sm:w-auto"
              disabled={unlinkMicrosoft.isPending}
              onClick={() => unlinkMicrosoft.mutate()}
            >
              <Unlink className="size-4" />
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
      </div>
    </section>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, MailCheck, Pickaxe, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useSession } from "@/hooks/useSession";
import { AppBackground } from "@/components/AppBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Craft Control" },
      { name: "description", content: "Sign in to your private Minecraft server control panel." },
      { property: "og:title", content: "Sign in — Craft Control" },
      {
        property: "og:description",
        content: "Sign in to your private Minecraft server control panel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && session) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message);
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Those passwords don't match.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      setSent(true);
      toast.success("Check your email to confirm your account.");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <AppBackground />

      <div className="w-full max-w-md">
        <div className="mb-7 flex flex-col items-center text-center">
          <div className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary shadow-glow">
            <Pickaxe className="size-7" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-glow">Craft Control</h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Your private control room for the Minecraft server running at home.
          </p>
        </div>

        <div className="panel bg-surface/80 p-6 backdrop-blur-md">
          {sent ? (
            <div className="text-center">
              <MailCheck className="mx-auto size-8 text-primary" />
              <p className="mt-3 text-sm text-muted-foreground">
                We sent a confirmation link to{" "}
                <span className="text-foreground">{email}</span>. Open it, then come back and sign
                in.
              </p>
              <Button variant="secondary" className="mt-4" onClick={() => setSent(false)}>
                Back to sign in
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign in</TabsTrigger>
                <TabsTrigger value="signup">Create account</TabsTrigger>
              </TabsList>

              {(["signin", "signup"] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-5">
                  <form onSubmit={tab === "signin" ? signIn : signUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`${tab}-email`}>Email</Label>
                      <Input
                        id={`${tab}-email`}
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`${tab}-password`}>Password</Label>
                      <Input
                        id={`${tab}-password`}
                        type="password"
                        autoComplete={tab === "signin" ? "current-password" : "new-password"}
                        placeholder={tab === "signup" ? "At least 8 characters" : "••••••••"}
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                    {tab === "signup" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-confirm">Confirm password</Label>
                        <Input
                          id="signup-confirm"
                          type="password"
                          autoComplete="new-password"
                          placeholder="Type it again"
                          required
                          minLength={8}
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                        />
                        {confirm && confirm !== password && (
                          <p className="text-xs text-destructive">Those passwords don’t match.</p>
                        )}
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={busy || (tab === "signup" && confirm !== password)}
                    >
                      {busy && <Loader2 className="size-4 animate-spin" />}
                      {tab === "signin" ? "Sign in" : "Create account"}
                    </Button>
                  </form>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Only your account can see or control your server.
        </p>
      </div>
    </main>
  );
}

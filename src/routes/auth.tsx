import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, MailCheck, Server, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

import { useSession } from "@/hooks/useSession";
import { AppBackground } from "@/components/AppBackground";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AetherLogo } from "@/components/AetherLogo";
import { MinecraftAvatar } from "@/components/MinecraftAvatar";
import { PENDING_MC_NAME_KEY } from "@/hooks/useProfile";


export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — Aether" },
      { name: "description", content: "Sign in to your private Aether Minecraft server control panel." },
      { property: "og:title", content: "Sign in — Aether" },
      {
        property: "og:description",
        content: "Sign in to your private Aether Minecraft server control panel.",
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [mcName, setMcName] = useState("");
  const [msBusy, setMsBusy] = useState(false);

  async function signInWithMicrosoft() {
    setMsBusy(true);
    if (mcName.trim()) window.localStorage.setItem(PENDING_MC_NAME_KEY, mcName.trim());
    const result = await lovable.auth.signInWithOAuth("microsoft", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMsBusy(false);
      toast.error("Microsoft sign-in didn’t work. Please try again.");
      return;
    }
    if (result.redirected) return;
    setMsBusy(false);
  }


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
    <main className="relative flex min-h-[100svh] items-center justify-center px-4 py-6 sm:py-10">
      <AppBackground />

      <div className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center sm:mb-7">
          <AetherLogo size={64} className="mb-4" />
          <h1 className="text-3xl font-semibold tracking-tight text-glow sm:text-4xl">Aether</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Your private control room for the Minecraft server running at home.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" />Private access</span>
            <span className="inline-flex items-center gap-1.5"><Smartphone className="size-3.5 text-primary" />Phone ready</span>
            <span className="inline-flex items-center gap-1.5"><Server className="size-3.5 text-primary" />Live controls</span>
          </div>
        </div>

        <div className="panel bg-surface/85 p-4 backdrop-blur-md sm:p-6">
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
            <Tabs defaultValue="signin" onValueChange={() => { setShowPassword(false); setShowConfirm(false); }}>
              <TabsList className="grid h-11 w-full grid-cols-2">
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
                      <div className="relative">
                        <Input
                          id={`${tab}-password`}
                          type={showPassword ? "text" : "password"}
                          autoComplete={tab === "signin" ? "current-password" : "new-password"}
                          placeholder={tab === "signup" ? "At least 8 characters" : "Enter your password"}
                          required
                          minLength={8}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-11 pr-11"
                        />
                        <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-9" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                          {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                      </div>
                    </div>
                    {tab === "signup" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-confirm">Confirm password</Label>
                        <div className="relative">
                          <Input
                            id="signup-confirm"
                            type={showConfirm ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="Type it again"
                            required
                            minLength={8}
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="h-11 pr-11"
                          />
                          <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1 size-9" onClick={() => setShowConfirm((value) => !value)} aria-label={showConfirm ? "Hide confirmation password" : "Show confirmation password"}>
                            {showConfirm ? <EyeOff /> : <Eye />}
                          </Button>
                        </div>
                        {confirm && confirm !== password && (
                          <p className="text-xs text-destructive">Those passwords don’t match.</p>
                        )}
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="h-11 w-full"
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

        <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <ShieldCheck className="size-3.5 text-primary" />
          Only your account can see or control your server.
        </p>
      </div>
    </main>
  );
}

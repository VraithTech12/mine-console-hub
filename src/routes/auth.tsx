import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  Server,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
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

function PasswordStrength({ value }: { value: string }) {
  const checks = [value.length >= 8, /[A-Z]/.test(value), /[0-9]/.test(value), /[^A-Za-z0-9]/.test(value)];
  const score = checks.filter(Boolean).length;
  const labels = ["Too short", "Weak", "Okay", "Good", "Strong"];
  const tones = ["bg-border", "bg-destructive", "bg-warning", "bg-primary", "bg-success"];
  if (!value) return null;
  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1 flex-1 rounded-full ${i < score ? tones[score] : "bg-border"}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{labels[score]} — 8+ characters, a number helps.</p>
    </div>
  );
}

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
  const [emailCode, setEmailCode] = useState("");
  const [mfaFactor, setMfaFactor] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");

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
    if (!loading && session && !mfaFactor) void navigate({ to: "/dashboard", replace: true });
  }, [loading, session, mfaFactor, navigate]);

  /** If the account has an authenticator app, ask for its code before going in. */
  async function checkSecondStep() {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2" && data.nextLevel !== data.currentLevel) {
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const factor = factors?.totp?.find((f) => f.status === "verified");
      if (factor) {
        setMfaFactor(factor.id);
        return true;
      }
    }
    return false;
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      toast.error(error.message);
      return;
    }
    await checkSecondStep();
    setBusy(false);
  }

  async function verifySecondStep(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaFactor) return;
    setBusy(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: mfaFactor,
      code: mfaCode.replace(/\s/g, ""),
    });
    setBusy(false);
    if (error) {
      toast.error("That code didn’t work. Try the newest one.");
      return;
    }
    setMfaCode("");
    setMfaFactor(null);
    void navigate({ to: "/dashboard", replace: true });
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
    if (mcName.trim()) window.localStorage.setItem(PENDING_MC_NAME_KEY, mcName.trim());

    if (!data.session) {
      setSent(true);
      toast.success("Check your email to confirm your account.");
    }
  }

  async function verifyEmailCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: emailCode.replace(/\s/g, ""),
      type: "signup",
    });
    setBusy(false);
    if (error) {
      toast.error("That code didn’t work. You can also use the link in the email.");
      return;
    }
    setEmailCode("");
    setSent(false);
    if (!(await checkSecondStep())) void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <main className="relative flex min-h-[100svh] items-center justify-center px-4 py-6 sm:py-10">
      <AppBackground />

      <div className="w-full max-w-md">
        <div className="mb-5 flex flex-col items-center text-center sm:mb-7">
          <AetherLogo size={64} className="mb-4" />
          <h1 className="text-3xl font-semibold tracking-tight text-glow sm:text-4xl">Aether</h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            Your private control room for your Minecraft server.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-3.5 text-primary" />Private access</span>
            <span className="inline-flex items-center gap-1.5"><Smartphone className="size-3.5 text-primary" />Phone ready</span>
            <span className="inline-flex items-center gap-1.5"><Server className="size-3.5 text-primary" />Live controls</span>
          </div>
        </div>

        <div className="panel bg-surface/85 p-4 shadow-2xl backdrop-blur-md sm:p-6">
          {mfaFactor ? (
            <form onSubmit={verifySecondStep} className="space-y-4 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Smartphone className="size-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold">One more step</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Open your authenticator app and type the 6-digit code for Aether.
                </p>
              </div>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={7}
                autoFocus
                className="h-12 text-center text-lg tracking-[0.4em]"
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value)}
              />
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={busy || mfaCode.replace(/\s/g, "").length < 6}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full"
                onClick={() => {
                  setMfaFactor(null);
                  setMfaCode("");
                  void supabase.auth.signOut();
                }}
              >
                <ArrowLeft className="size-4" />
                Back to sign in
              </Button>
            </form>
          ) : sent ? (
            <form onSubmit={verifyEmailCode} className="space-y-4 text-center">
              <MailCheck className="mx-auto size-8 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">
                We sent a confirmation to <span className="text-foreground">{email}</span>. Open the
                link in it, or type the code below if your email shows one.
              </p>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={8}
                className="h-12 text-center text-lg tracking-[0.4em]"
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
              />
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={busy || emailCode.replace(/\s/g, "").length < 6}
              >
                {busy && <Loader2 className="size-4 animate-spin" />}
                Confirm my account
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-10 w-full"
                onClick={() => setSent(false)}
              >
                <ArrowLeft className="size-4" />
                Back to sign in
              </Button>
            </form>
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
                        className="h-11"
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
                      {tab === "signup" && <PasswordStrength value={password} />}
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
                    {tab === "signup" && (
                      <div className="space-y-1.5">
                        <Label htmlFor="signup-mc">Minecraft name (optional)</Label>
                        <div className="flex items-center gap-3">
                          <MinecraftAvatar username={mcName} size={44} />
                          <Input
                            id="signup-mc"
                            placeholder="Steve"
                            maxLength={16}
                            value={mcName}
                            onChange={(e) => setMcName(e.target.value)}
                            className="h-11"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Your character’s head becomes your avatar.
                        </p>
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

                  <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    or
                    <span className="h-px flex-1 bg-border" />
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 w-full"
                    disabled={msBusy}
                    onClick={() => void signInWithMicrosoft()}
                  >
                    {msBusy ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <svg viewBox="0 0 23 23" className="size-4" aria-hidden>
                        <path fill="#f35325" d="M1 1h10v10H1z" />
                        <path fill="#81bc06" d="M12 1h10v10H12z" />
                        <path fill="#05a6f0" d="M1 12h10v10H1z" />
                        <path fill="#ffba08" d="M12 12h10v10H12z" />
                      </svg>
                    )}
                    {tab === "signin" ? "Sign in with Microsoft" : "Continue with Microsoft"}
                  </Button>
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

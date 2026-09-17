import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  Cpu,
  Gauge,
  LayoutDashboard,
  Loader2,
  LogOut,
  MemoryStick,
  RefreshCw,
  Settings,
  Terminal,
  Timer,
  Users,
  UsersRound,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { StatusDot, type DotState } from "@/components/StatusDot";
import { AppBackground } from "@/components/AppBackground";
import { PairAgentCard } from "@/components/PairAgentCard";
import { AgentSettingsCard } from "@/components/AgentSettingsCard";
import { HelperAddressesCard } from "@/components/HelperAddressesCard";
import { ServerControls } from "@/components/ServerControls";
import { ConsolePanel } from "@/components/ConsolePanel";
import { QuickCommands } from "@/components/QuickCommands";
import { PlayersCard } from "@/components/PlayersCard";
import { StatMeter } from "@/components/StatMeter";
import { TeamCard } from "@/components/TeamCard";
import { AetherLogo } from "@/components/AetherLogo";
import { MinecraftAvatar } from "@/components/MinecraftAvatar";
import { CharacterCard } from "@/components/CharacterCard";
import { AccountCard } from "@/components/AccountCard";
import { TwoFactorCard } from "@/components/TwoFactorCard";
import { DashboardNav, type NavItem } from "@/components/DashboardNav";
import { useProfile } from "@/hooks/useProfile";
import { useRole } from "@/hooks/useRole";
import { formatUptime, formatWhen, isLive, type AgentRow } from "@/lib/agent-client";
import { EMPTY_STATUS, type ServerStatus } from "@/lib/protocol";


export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Server dashboard — Aether" },
      {
        name: "description",
        content:
          "Start, stop and watch your home Minecraft Forge server, and send console commands from anywhere.",
      },
      { property: "og:title", content: "Server dashboard — Aether" },
      {
        property: "og:description",
        content: "Start, stop and watch your home Minecraft server from anywhere.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { session, user, loading } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useRole(user?.id);
  const profile = useProfile(user?.id, user?.email);
  const [tab, setTab] = useState("overview");

  const navItems: NavItem[] = [
    { value: "overview", label: "Overview", icon: LayoutDashboard },
    { value: "console", label: "Console", icon: Terminal },
    { value: "setup", label: "Settings", icon: Settings },
    ...(role.isOwner ? [{ value: "team", label: "Team", icon: UsersRound }] : []),
  ];


  useEffect(() => {
    if (!loading && !session) void navigate({ to: "/auth", replace: true });
  }, [loading, session, navigate]);

  const agents = useQuery({
    queryKey: ["agents", user?.id],
    enabled: Boolean(user?.id),
    refetchInterval: 3000,
    queryFn: async (): Promise<AgentRow[]> => {
      const { data, error } = await supabase
        .from("agents")
        .select(
          "id, user_id, agent_key, name, platform, connection_state, last_seen, actions, status, created_at",
        )
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as AgentRow[];
    },
  });

  const refresh = useCallback(() => {
    void agents.refetch();
  }, [agents]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const agent = agents.data?.[0];
  const status = { ...EMPTY_STATUS, ...((agent?.status ?? {}) as Partial<ServerStatus>) };
  const live = agent ? isLive(agent) : false;
  const dot: DotState = live ? "connected" : agent ? "offline" : "connecting";
  const running = status.state === "online";
  const playerPercent =
    status.players !== null && status.maxPlayers
      ? (status.players / status.maxPlayers) * 100
      : null;

  return (
    <div className="relative min-h-screen pb-10">
      <AppBackground />

      <header className="sticky top-0 z-20 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {profile.minecraftUsername ? (
              <MinecraftAvatar
                username={profile.minecraftUsername}
                size={40}
                className="size-9 rounded-xl sm:size-10"
              />
            ) : (
              <AetherLogo size={40} className="size-9 rounded-xl sm:size-10" />
            )}
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight sm:text-base">
                {profile.minecraftUsername ?? "Aether"}
              </h1>
              <p className="truncate text-[11px] text-muted-foreground sm:text-xs">{user.email}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <StatusDot
              state={dot}
              label={live ? "Helper online" : "Helper offline"}
              className="hidden sm:inline-flex"
            />
            <StatusDot state={dot} label="" className="sm:hidden" />
            <Button variant="ghost" size="sm" onClick={refresh} title="Refresh">
              <RefreshCw className={`size-4 ${agents.isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void (async () => {
                  await queryClient.cancelQueries();
                  queryClient.clear();
                  await supabase.auth.signOut();
                  await navigate({ to: "/auth", replace: true });
                })();
              }}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 pb-24 pt-4 sm:px-4 sm:pb-10 sm:pt-6">
        <Tabs value={tab} onValueChange={setTab}>
          <DashboardNav items={navItems} value={tab} onChange={setTab} />



          <TabsContent value="overview" className="mt-4 space-y-4">
            {!agent ? (
              <div className="space-y-4">
                <section className="px-1 py-2 sm:py-3">
                  <p className="text-xs font-medium uppercase text-primary">Welcome to Aether</p>
                  <h2 className="mt-1 text-xl font-semibold sm:text-2xl">
                    Connect your first server
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">
                    Create a secure code here, then enter it in the helper app on your server
                    computer.
                  </p>
                </section>
                <div className="grid min-w-0 gap-4 lg:grid-cols-2">
                  <PairAgentCard userId={user.id} onPaired={refresh} />
                  <HelperAddressesCard />
                </div>
              </div>
            ) : (
              <>
              <section className="panel overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border/70 bg-surface-2/40 p-4 sm:p-5">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-semibold">{agent.name}</h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {agent.platform ?? "Unknown computer"} · seen {formatWhen(agent.last_seen)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize sm:text-xs ${
                      !live
                        ? "border-warning/40 bg-warning/15 text-warning"
                        : running
                          ? "border-success/40 bg-success/15 text-success"
                          : "border-border bg-surface-2 text-muted-foreground"
                    }`}
                  >
                    {live ? status.state : "unreachable"}
                  </span>
                </div>

                {!live ? (
                  <div className="flex items-start gap-3 p-4 sm:p-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-warning/15 text-warning">
                      <WifiOff className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Can’t reach the server</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">
                        The helper app on your server computer isn’t answering, so we can’t show
                        players, uptime or usage right now. Open the helper and this updates on its
                        own.
                      </p>
                    </div>
                  </div>
                ) : (
                <div className="grid grid-cols-2 gap-2.5 p-4 sm:gap-3 sm:p-5 lg:grid-cols-4">
                  <StatMeter
                    icon={Users}
                    label="Players"
                    value={
                      status.players === null
                        ? "—"
                        : `${status.players}${status.maxPlayers ? `/${status.maxPlayers}` : ""}`
                    }
                    percent={playerPercent}
                  />
                  <StatMeter
                    icon={Timer}
                    label="Uptime"
                    value={formatUptime(status.uptimeSeconds)}
                    percent={running ? 100 : 0}
                    tone="chat"
                  />
                  <StatMeter
                    icon={Cpu}
                    label="CPU"
                    value={status.cpuPercent === null ? "—" : `${Math.round(status.cpuPercent)}%`}
                    percent={status.cpuPercent}
                    tone={status.cpuPercent && status.cpuPercent > 85 ? "warning" : "primary"}
                  />
                  <StatMeter
                    icon={MemoryStick}
                    label="Memory"
                    value={
                      status.memoryMb === null
                        ? "—"
                        : status.memoryMb >= 1024
                          ? `${(status.memoryMb / 1024).toFixed(1)} GB`
                          : `${Math.round(status.memoryMb)} MB`
                    }
                    hint={status.memoryMb === null ? undefined : "of 16 GB"}
                    percent={status.memoryMb === null ? null : (status.memoryMb / 16384) * 100}
                    tone="chat"
                  />
                </div>
                )}

                <div className="border-t border-border/70 p-4 sm:p-5">
                  {status.lastError && (
                    <p className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive-foreground">
                      {status.lastError}
                    </p>
                  )}
                  <ServerControls agent={agent} state={status.state} onDone={refresh} />
                  {!live && (
                    <p className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                      <Gauge className="mt-0.5 size-3.5 shrink-0" />
                      The helper app on your home computer isn’t connected, so controls are paused.
                      Open it and it will reconnect on its own.
                    </p>
                  )}
                </div>
              </section>

              {live && (
                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="lg:col-span-2">
                    <QuickCommands agent={agent} />
                  </div>
                  <PlayersCard
                    players={status.players}
                    max={status.maxPlayers}
                    list={status.playerList}
                  />
                </div>
              )}
              </>
            )}
          </TabsContent>

          <TabsContent value="console" className="mt-4">
            {agent ? (
              <ConsolePanel agent={agent} />
            ) : (
              <section className="panel p-4 sm:p-5">
                <h2 className="text-base font-semibold">Console</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Once your server computer is linked, everything it prints shows up here and you
                  can type commands back to it.
                </p>
              </section>
            )}
          </TabsContent>

          <TabsContent value="setup" className="mt-4 grid gap-4 lg:grid-cols-2">
            <AccountCard
              email={user.email}
              minecraftUsername={profile.minecraftUsername}
              saving={profile.saving}
              onSaveName={profile.save}
            />
            <HelperAddressesCard />
            <CharacterCard
              username={profile.minecraftUsername}
              saving={profile.saving}
              onSave={profile.save}
            />
            {agent ? (
              <AgentSettingsCard agent={agent} onChanged={refresh} />
            ) : (
              <PairAgentCard userId={user.id} onPaired={refresh} />
            )}
          </TabsContent>

          {role.isOwner && (
            <TabsContent value="team" className="mt-4">
              <TeamCard />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Loader2, MailPlus, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  cancelTeamInvite,
  getTeam,
  inviteTeamMember,
  removeTeamRole,
} from "@/lib/team.functions";

export function TeamCard() {
  const fetchTeam = useServerFn(getTeam);
  const invite = useServerFn(inviteTeamMember);
  const remove = useServerFn(removeTeamRole);
  const cancel = useServerFn(cancelTeamInvite);
  const qc = useQueryClient();
  const [email, setEmail] = useState("");

  const team = useQuery({
    queryKey: ["team"],
    queryFn: () => fetchTeam(),
  });

  const refresh = () => void qc.invalidateQueries({ queryKey: ["team"] });

  const add = useMutation({
    mutationFn: () => invite({ data: { email: email.trim(), role: "admin" } }),
    onSuccess: (res) => {
      setEmail("");
      toast.success(
        res.applied
          ? "They're an admin now."
          : "Invitation saved — they become an admin the first time they sign in.",
      );
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const drop = useMutation({
    mutationFn: (userId: string) => remove({ data: { userId } }),
    onSuccess: () => {
      toast.success("Access removed.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const dropInvite = useMutation({
    mutationFn: (id: string) => cancel({ data: { id } }),
    onSuccess: () => {
      toast.success("Invitation cancelled.");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="panel p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <ShieldCheck className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Team access</h2>
      </div>

      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) add.mutate();
        }}
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email">Add an admin by email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="friend@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={add.isPending || !email.trim()}>
          {add.isPending ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
          Add admin
        </Button>
      </form>

      <div className="mt-5 space-y-2">
        {team.isLoading && <Loader2 className="size-4 animate-spin text-primary" />}
        {team.error && (
          <p className="text-xs text-destructive">{(team.error as Error).message}</p>
        )}

        {team.data?.members.map((m) => (
          <div
            key={m.userId}
            className="flex flex-col gap-2 rounded-md border border-border/70 bg-surface-2/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate text-sm">{m.email ?? m.userId}</span>
            </div>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-0.5 text-[11px] capitalize text-primary">
                {m.roles.join(", ")}
              </span>
              {!m.roles.includes("owner") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => drop.mutate(m.userId)}
                  disabled={drop.isPending}
                  title="Remove access"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        ))}

        {team.data?.invites.map((i) => (
          <div
            key={i.id}
            className="flex flex-col gap-2 rounded-md border border-dashed border-border px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
          >
            <span className="truncate text-sm text-muted-foreground">{i.email}</span>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
              <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] capitalize text-muted-foreground">
                {i.role} · invited
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dropInvite.mutate(i.id)}
                disabled={dropInvite.isPending}
                title="Cancel invitation"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Admins can watch and control the server and use the console. Only you, as owner, can change
        who has access.
      </p>
    </section>
  );
}

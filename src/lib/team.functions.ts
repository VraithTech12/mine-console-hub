import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface TeamMember {
  userId: string;
  email: string | null;
  roles: string[];
}
export interface TeamInvite {
  id: string;
  email: string;
  role: string;
}

/** Owner-only team listing: members with roles, plus outstanding invitations. */
export const getTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: mine } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isOwner = (mine ?? []).some((r) => r.role === "owner");
    if (!isOwner) throw new Error("Only the owner can manage the team.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: roles }, { data: profiles }, { data: invites }] = await Promise.all([
      supabaseAdmin.from("user_roles").select("user_id, role"),
      supabaseAdmin.from("profiles").select("id, email"),
      supabaseAdmin
        .from("pending_role_grants")
        .select("id, email, role")
        .is("claimed_at", null)
        .order("created_at", { ascending: true }),
    ]);

    const emails = new Map((profiles ?? []).map((p) => [p.id as string, p.email as string | null]));
    const grouped = new Map<string, TeamMember>();
    for (const row of roles ?? []) {
      const id = row.user_id as string;
      const entry = grouped.get(id) ?? { userId: id, email: emails.get(id) ?? null, roles: [] };
      entry.roles.push(row.role as string);
      grouped.set(id, entry);
    }

    return {
      members: [...grouped.values()],
      invites: (invites ?? []) as TeamInvite[],
    };
  });

/** Invite an email address as admin (or member). Applied when they next sign in. */
export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({ email: z.string().email(), role: z.enum(["admin", "member"]) })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: mine } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(mine ?? []).some((r) => r.role === "owner")) {
      throw new Error("Only the owner can invite people.");
    }

    const email = data.email.trim().toLowerCase();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Already has an account? Grant straight away.
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (profile?.id) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: profile.id as string, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
      return { applied: true as const };
    }

    const { error } = await supabaseAdmin
      .from("pending_role_grants")
      .upsert({ email, role: data.role, claimed_at: null }, { onConflict: "email" });
    if (error) throw new Error(error.message);
    return { applied: false as const };
  });

/** Remove a person's role (owners cannot be removed this way). */
export const removeTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: mine } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(mine ?? []).some((r) => r.role === "owner")) {
      throw new Error("Only the owner can change the team.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.userId)
      .neq("role", "owner");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Cancel an invitation that hasn't been used yet. */
export const cancelTeamInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { data: mine } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (!(mine ?? []).some((r) => r.role === "owner")) {
      throw new Error("Only the owner can change the team.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("pending_role_grants").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

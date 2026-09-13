import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Role = "owner" | "admin" | "member";

/**
 * Applies any pending invitation for the signed-in account, then reports
 * that account's roles.
 */
export function useRole(userId: string | undefined) {
  const query = useQuery({
    queryKey: ["roles", userId],
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async (): Promise<Role[]> => {
      await supabase.rpc("claim_pending_role");
      if (!userId) return [];
      const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => r.role as Role);
    },
  });

  const roles = query.data ?? [];
  return {
    roles,
    isOwner: roles.includes("owner"),
    isStaff: roles.includes("owner") || roles.includes("admin"),
    loading: query.isLoading,
  };
}

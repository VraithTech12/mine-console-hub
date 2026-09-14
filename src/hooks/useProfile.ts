import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PENDING_MC_NAME_KEY = "aether.pendingMinecraftName";

type Profile = { id: string; email: string | null; minecraft_username: string | null };

/** Reads and updates the signed-in person's profile (Minecraft name for the avatar). */
export function useProfile(userId?: string, email?: string | null) {
  const queryClient = useQueryClient();

  const profile = useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, minecraft_username")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as Profile | null) ?? null;
    },
  });

  const save = useMutation({
    mutationFn: async (minecraftUsername: string | null) => {
      const { error } = await supabase.from("profiles").upsert({
        id: userId!,
        email: email ?? null,
        minecraft_username: minecraftUsername,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile", userId] });
    },
  });

  // Apply a name chosen while creating the account, once they are signed in.
  useEffect(() => {
    if (!userId || profile.isLoading || save.isPending) return;
    if (profile.data?.minecraft_username) return;
    const pending = window.localStorage.getItem(PENDING_MC_NAME_KEY);
    if (!pending) return;
    window.localStorage.removeItem(PENDING_MC_NAME_KEY);
    save.mutate(pending);
  }, [userId, profile.isLoading, profile.data?.minecraft_username, save]);

  return {
    minecraftUsername: profile.data?.minecraft_username ?? null,
    loading: profile.isLoading,
    save: (name: string | null) => save.mutateAsync(name),
    saving: save.isPending,
  };
}

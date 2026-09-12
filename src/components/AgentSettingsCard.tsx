import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eraser, Pencil, Settings2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AgentRow } from "@/lib/agent-client";

export function AgentSettingsCard({
  agent,
  onChanged,
}: {
  agent: AgentRow;
  onChanged: () => void;
}) {
  const [name, setName] = useState(agent.name);

  const rename = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.from("agents").update({ name: value }).eq("id", agent.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Name updated.");
      onChanged();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const clearConsole = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("console_lines").delete().eq("agent_id", agent.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => toast.success("Console history cleared."),
    onError: (error: Error) => toast.error(error.message),
  });

  const unpair = useMutation({
    mutationFn: async () => {
      // Remove every registration owned by this account so an older, hidden
      // pairing cannot become the active helper after this one is removed.
      const { error } = await supabase.from("agents").delete().eq("user_id", agent.user_id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Computer unpaired.");
      onChanged();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section className="panel p-5">
      <header className="flex items-center gap-2">
        <Settings2 className="size-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold">Computer settings</h2>
      </header>

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const value = name.trim();
          if (value && value !== agent.name) rename.mutate(value);
        }}
      >
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Computer name" />
        <Button
          type="submit"
          variant="secondary"
          disabled={rename.isPending || !name.trim() || name.trim() === agent.name}
        >
          <Pencil className="size-4" />
          Rename
        </Button>
      </form>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={clearConsole.isPending}
          onClick={() => clearConsole.mutate()}
        >
          <Eraser className="size-4" />
          Clear console history
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={unpair.isPending}
          onClick={() => {
            if (window.confirm("Unpair this computer? You'll need a new code to reconnect it."))
              unpair.mutate();
          }}
        >
          <Unplug className="size-4" />
          Unpair computer
        </Button>
      </div>
    </section>
  );
}

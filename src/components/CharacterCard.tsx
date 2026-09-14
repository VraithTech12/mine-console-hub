import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MinecraftAvatar } from "@/components/MinecraftAvatar";

type Props = {
  username: string | null;
  saving: boolean;
  onSave: (name: string | null) => Promise<void>;
};

/** Lets someone pick the Minecraft character whose head becomes their avatar. */
export function CharacterCard({ username, saving, onSave }: Props) {
  const [value, setValue] = useState(username ?? "");

  useEffect(() => {
    setValue(username ?? "");
  }, [username]);

  const preview = value.trim();

  return (
    <section className="panel min-w-0 p-4 sm:p-5">
      <h2 className="text-base font-semibold">Your character</h2>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">
        Add your Minecraft name and your character’s head becomes your avatar.
      </p>

      <div className="mt-4 flex items-center gap-3">
        <MinecraftAvatar username={preview} size={56} className="rounded-xl" />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor="mc-name">Minecraft name</Label>
          <Input
            id="mc-name"
            value={value}
            placeholder="Steve"
            maxLength={16}
            className="h-11"
            onChange={(e) => setValue(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button
          className="h-11 w-full sm:w-auto"
          disabled={saving || preview === (username ?? "")}
          onClick={() => {
            void (async () => {
              try {
                await onSave(preview || null);
                toast.success(preview ? "Avatar updated." : "Avatar cleared.");
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Could not save that.");
              }
            })();
          }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save avatar
        </Button>
        {username && (
          <Button
            variant="secondary"
            className="h-11 w-full sm:w-auto"
            disabled={saving}
            onClick={() => setValue("")}
          >
            Clear
          </Button>
        )}
      </div>
    </section>
  );
}

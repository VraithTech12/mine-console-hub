import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STABLE_HOST = "project--d90352af-4043-4deb-89c8-8a81e27ff534-dev.lovable.app";

export const WEBSITE_URL = `https://${STABLE_HOST}/api/public`;
export const RELAY_URL = `wss://${STABLE_HOST}/api/public/agent/relay`;

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-3 min-w-0">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs">
          {value}
        </code>
        <Button
          variant="secondary"
          size="icon"
          aria-label={`Copy ${label}`}
          onClick={() => {
            void navigator.clipboard.writeText(value);
            toast.success("Copied");
          }}
        >
          <Copy className="size-4" />
        </Button>
      </div>
    </div>
  );
}

export function HelperAddressesCard() {
  return (
    <section className="panel min-w-0 p-4 sm:p-5">
      <header className="flex items-center gap-2">
        <Link2 className="size-4 text-primary" />
        <h2 className="text-sm font-semibold">Addresses for the helper app</h2>
      </header>
      <p className="mt-2 text-sm text-muted-foreground">
        Paste these two addresses into the helper app on your home computer. Use these exact ones —
        not the preview address starting with <span className="font-mono">id-preview…</span> (it asks
        for a login) and not your Vercel address (Vercel can’t hold the live connection the helper
        needs, so it fails to connect).
      </p>
      <Row label="Website URL" value={WEBSITE_URL} />
      <Row label="Relay URL" value={RELAY_URL} />
    </section>
  );
}

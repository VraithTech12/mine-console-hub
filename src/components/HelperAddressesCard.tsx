import { Copy, Link2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const STABLE_HOST = "project--1daf49e9-b583-4a18-89cb-1b5f9c0d8ffc-dev.lovable.app";

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
        Paste these two addresses into the helper app on your home computer. Don’t use the preview
        address that starts with <span className="font-mono">id-preview…</span> — it asks for a
        login, which is why pairing failed before.
      </p>
      <Row label="Website URL" value={WEBSITE_URL} />
      <Row label="Relay URL" value={RELAY_URL} />
    </section>
  );
}

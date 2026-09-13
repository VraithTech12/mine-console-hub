import logo from "@/assets/aether-logo.png.asset.json";
import { cn } from "@/lib/utils";

/** The Ether mark (PNG artwork) in a soft violet halo. */
export function AetherLogo({ className, size = 40 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 shadow-glow",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <img
        src={logo.url}
        alt="Ether"
        width={size}
        height={size}
        className="size-[72%] object-contain drop-shadow-[0_0_10px_oklch(0.62_0.24_295_/_55%)]"
        loading="eager"
        decoding="async"
      />
    </span>
  );
}

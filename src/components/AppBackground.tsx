import bg from "@/assets/minecraft-bg.png.asset.json";

/** Fixed Minecraft scenery behind the whole app, dimmed for readability. */
export function AppBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <img
        src={bg.url}
        alt=""
        className="size-full object-cover"
        loading="eager"
        decoding="async"
      />
      <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background" />
    </div>
  );
}

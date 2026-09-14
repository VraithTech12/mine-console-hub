import { useEffect, useState } from "react";
import { User } from "lucide-react";

type Props = {
  username?: string | null;
  size?: number;
  className?: string;
};

export function avatarUrl(username: string, size: number) {
  return `https://mc-heads.net/avatar/${encodeURIComponent(username)}/${size}`;
}

/** Shows the head of a Minecraft character as the account avatar. */
export function MinecraftAvatar({ username, size = 40, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const name = username?.trim();

  useEffect(() => {
    setFailed(false);
  }, [name]);

  if (!name || failed) {
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-lg border border-border bg-surface-2 text-muted-foreground ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <User className="size-1/2" />
      </span>
    );
  }

  return (
    <img
      src={avatarUrl(name, size * 2)}
      alt={`Minecraft head of ${name}`}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`shrink-0 rounded-lg border border-border bg-surface-2 object-cover [image-rendering:pixelated] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

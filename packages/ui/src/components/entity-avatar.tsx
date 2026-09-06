import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

// Deterministic, readable palette — the same name/email always maps to the
// same color, so an entity without an uploaded image stays visually
// recognizable across the app. Full class strings (not built by
// interpolating a color name into a template) so Tailwind's static scan
// picks them all up regardless of which one a given entity gets.
const PALETTE = [
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getInitials(name?: string | null): string {
  const trimmed = name?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

interface EntityAvatarProps {
  /** Used both as alt text and to derive the initials/color fallback. */
  name?: string | null;
  imageUrl?: string | null;
  className?: string;
}

/**
 * An avatar for any named entity (a newsletter, a subscriber, ...) that
 * shows a real image when one's set and otherwise falls back to a
 * deterministic colored initial — never a broken image icon or a blank
 * circle.
 */
export function EntityAvatar({ name, imageUrl, className }: EntityAvatarProps) {
  const color = PALETTE[hashString(name || "") % PALETTE.length];
  const initials = getInitials(name);

  return (
    <Avatar className={cn("size-8", className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name || "Avatar"} />}
      <AvatarFallback className={cn(color, "text-white font-medium text-xs")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

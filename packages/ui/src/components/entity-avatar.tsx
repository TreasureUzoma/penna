import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

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
  const initials = getInitials(name);

  return (
    <Avatar className={cn("size-8", className)}>
      {imageUrl && <AvatarImage src={imageUrl} alt={name || "Avatar"} />}
      {/* Monochrome by design, not per-entity color — bg-foreground/
          text-background inverts correctly in both themes (black-on-white
          in light mode, white-on-black in dark mode) without a colorful
          palette. */}
      <AvatarFallback className="bg-foreground text-background font-medium text-xs">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

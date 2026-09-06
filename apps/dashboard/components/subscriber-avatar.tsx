import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

// Deterministic, readable palette — the same email always maps to the same
// color, so a subscriber stays visually recognizable across the dashboard
// without needing an uploaded photo. Full class strings (not built by
// interpolating a color name into a template) so Tailwind's static scan
// picks them all up regardless of which one a given subscriber gets.
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

function getInitials(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/);
    if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "?";
}

interface SubscriberAvatarProps {
  name?: string | null;
  email?: string | null;
  className?: string;
}

export function SubscriberAvatar({
  name,
  email,
  className,
}: SubscriberAvatarProps) {
  const key = email || name || "";
  const color = PALETTE[hashString(key) % PALETTE.length];
  const initials = getInitials(name, email);

  return (
    <Avatar className={cn("size-8", className)}>
      <AvatarFallback className={cn(color, "text-white font-medium text-xs")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

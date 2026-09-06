import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { cn } from "@workspace/ui/lib/utils";

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
  const initials = getInitials(name, email);

  return (
    <Avatar className={cn("size-8", className)}>
      {/* Monochrome by design, not per-subscriber color — bg-foreground/
          text-background inverts correctly in both themes. */}
      <AvatarFallback className="bg-foreground text-background font-medium text-xs">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

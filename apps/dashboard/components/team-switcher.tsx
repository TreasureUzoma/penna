"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react";

import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@workspace/ui/components/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover";
import { useActiveTeam } from "@/hooks/use-active-team";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { EntityAvatar } from "@workspace/ui/components/entity-avatar";

/**
 * Same popover/command/list/"create" shape as NewsletterSwitcher (see
 * components/newsletter-switcher.tsx) — but lives in the global sidebar,
 * not scoped inside a single newsletter's layout, since a team spans
 * multiple newsletters.
 */
export function TeamSwitcher() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { teams, activeTeam, setActiveTeam, isLoading } = useActiveTeam();
  const selectedTeam =
    pathname === "/settings/team"
      ? (teams.find((team) => team.slug === searchParams.get("team")) ??
        activeTeam)
      : activeTeam;

  if (!isLoading && (!teams || teams.length === 0)) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="justify-between w-full !px-2"
        >
          {selectedTeam ? (
            <span className="flex items-center gap-2 truncate">
              <EntityAvatar
                name={selectedTeam.name}
                className="size-5 shrink-0"
              />
              <span className="truncate text-sm">{selectedTeam.name}</span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Select team...</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search team..." />
          <CommandList>
            <CommandEmpty>No team found.</CommandEmpty>
            <CommandGroup heading="Teams">
              {teams?.map((team) => (
                <CommandItem
                  key={team.id}
                  onSelect={() => {
                    setActiveTeam(team);
                    if (pathname === "/settings/team") {
                      router.push(`/settings/team?team=${team.slug}`);
                    } else if (pathname.startsWith("/settings/billing")) {
                      router.push(`/settings/billing?team=${team.slug}`);
                    } else if (
                      pathname.startsWith("/newsletters/") ||
                      pathname === "/new"
                    ) {
                      router.push("/newsletters");
                    } else {
                      router.push(pathname);
                    }
                    setOpen(false);
                  }}
                  className="text-sm gap-2"
                >
                  <EntityAvatar name={team.name} className="size-5 shrink-0" />
                  <span className="truncate">{team.name}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedTeam?.id === team.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          <CommandSeparator />
          <CommandList>
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  router.push("/settings/team");
                  setOpen(false);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Manage teams
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

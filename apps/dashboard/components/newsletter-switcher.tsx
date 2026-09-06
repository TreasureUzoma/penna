"use client";

import * as React from "react";
import { Check, ChevronsUpDown, PlusCircle, Folder } from "lucide-react";

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
import { useNewsletters } from "@/hooks/use-newsletters";
import { useRouter, useParams } from "next/navigation";

export function NewsletterSwitcher() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const params = useParams();
  const { data: newsletters, isLoading } = useNewsletters();

  const selectedNewsletter = newsletters?.find(
    (newsletter) => newsletter.slug === params.id,
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="justify-between max-w-[110px] md:max-w-[150px] !px-0"
        >
          {selectedNewsletter ? (
            <span className="flex items-center truncate">
              <span className="truncate">{selectedNewsletter.name}</span>
            </span>
          ) : (
            "Select newsletter..."
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="ml-3 w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search newsletter..." />
          <CommandList>
            <CommandEmpty>No newsletter found.</CommandEmpty>
            <CommandGroup heading="Newsletters">
              {newsletters?.map((newsletter) => (
                <CommandItem
                  key={newsletter.id}
                  onSelect={() => {
                    router.push(`/newsletters/${newsletter.slug}`);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  {newsletter.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedNewsletter?.id === newsletter.id
                        ? "opacity-100"
                        : "opacity-0",
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
                  router.push("/new");
                  setOpen(false);
                }}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Newsletter
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

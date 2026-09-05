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
import { useProjects } from "@/hooks/use-projects";
import { useRouter, useParams } from "next/navigation";

export function ProjectSwitcher() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const params = useParams();
  const { data: projects, isLoading } = useProjects();

  const selectedProject = projects?.find(
    (project) => project.slug === params.id,
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="justify-between max-w-[138px]"
        >
          {selectedProject ? (
            <span className="flex items-center truncate">
              <span className="truncate">{selectedProject.name}</span>
            </span>
          ) : (
            "Select project..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search project..." />
          <CommandList>
            <CommandEmpty>No project found.</CommandEmpty>
            <CommandGroup heading="Projects">
              {projects?.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => {
                    router.push(`/projects/${project.slug}`);
                    setOpen(false);
                  }}
                  className="text-sm"
                >
                  {project.name}
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      selectedProject?.id === project.id
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
                Create Project
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

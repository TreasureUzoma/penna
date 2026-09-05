"use client";

import { useDeleteProject, useUpdateProject } from "@/hooks/use-projects";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProjectSchema } from "@workspace/validations";
import type { UpdateProject } from "@workspace/validations";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { Input } from "@workspace/ui/components/input";
import { cn } from "@workspace/ui/lib/utils";
import { Globe, Loader2, Lock, Sparkles, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@workspace/ui/components/alert-dialog";
import { ApiKeysTab as ProjectApiKeysTab } from "./api-keys-tab";
import { MembersTab } from "./members-tab";
import { Textarea } from "@workspace/ui/components/textarea";
import { ProjectIdTab } from "./project-id-tab";

interface SettingsTabProps {
  project: {
    id: string;
    name: string;
    description: string;
    isPublic: boolean;
    isPrivateAt: string | null;
    config?: { removeBranding?: boolean } | null;
    /** Computed server-side from the project owner's plan — see routes/api/v1/projects.ts's `/slug/:slug`. */
    canRemoveBranding: boolean;
  };
}

export function SettingsTab({ project }: SettingsTabProps) {
  const { mutate: updateProject, isPending: isUpdating } = useUpdateProject(
    project.id
  );
  const { mutate: deleteProject, isPending: isDeleting } = useDeleteProject();

  const form = useForm<UpdateProject>({
    resolver: zodResolver(updateProjectSchema),
    defaultValues: {
      name: project.name,
      description: project?.description,
      isPublic: !project.isPrivateAt,
    },
  });

  function onSubmit(values: UpdateProject) {
    updateProject(values);
  }

  function toggleBranding(removeBranding: boolean) {
    // "Show branding" (false) is always allowed — only removing it is
    // gated. Guard client-side too so a disabled card can't still fire a
    // request that we already know the server will 400 on.
    if (removeBranding && !project.canRemoveBranding) return;
    updateProject({ removeBranding });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Update your project's general information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              id="project-settings-form"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Project" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility</FormLabel>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div
                        className={cn(
                          "cursor-pointer border rounded-lg p-4 flex flex-col gap-2 transition-all hover:border-primary/50",
                          field.value === true
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-card"
                        )}
                        onClick={() => field.onChange(true)}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <Globe className="w-4 h-4" />
                          Public
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Anyone can view this project.
                        </p>
                      </div>

                      <div
                        className={cn(
                          "cursor-pointer border rounded-lg p-4 flex flex-col gap-2 transition-all hover:border-primary/50",
                          field.value === false
                            ? "border-primary bg-primary/5 ring-1 ring-primary"
                            : "bg-card"
                        )}
                        onClick={() => field.onChange(false)}
                      >
                        <div className="flex items-center gap-2 font-medium">
                          <Lock className="w-4 h-4" />
                          Private
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Only you and your team can view this.
                        </p>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            type="submit"
            form="project-settings-form"
            disabled={isUpdating}
          >
            {isUpdating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Branding
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="w-3 h-3" />
              Pro
            </span>
          </CardTitle>
          <CardDescription>
            Remove the "Powered by Penna" footer from your outgoing
            emails. Requires the project owner to be on a paid plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={cn(
                "cursor-pointer border rounded-lg p-4 flex flex-col gap-2 transition-all hover:border-primary/50",
                !project.config?.removeBranding
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "bg-card"
              )}
              onClick={() => toggleBranding(false)}
            >
              <div className="font-medium">Show Penna branding</div>
              <p className="text-sm text-muted-foreground">
                Default — a small footer credits Penna on every email.
              </p>
            </div>

            <div
              className={cn(
                "border rounded-lg p-4 flex flex-col gap-2 transition-all",
                !project.canRemoveBranding
                  ? "opacity-60 cursor-not-allowed bg-muted/30"
                  : "cursor-pointer hover:border-primary/50",
                project.config?.removeBranding && project.canRemoveBranding
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "bg-card"
              )}
              onClick={() => toggleBranding(true)}
              aria-disabled={!project.canRemoveBranding}
            >
              <div className="font-medium flex items-center gap-1.5">
                {!project.canRemoveBranding && (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                Remove branding
              </div>
              {project.canRemoveBranding ? (
                <p className="text-sm text-muted-foreground">
                  No footer. Requires a Pro (or higher) plan on this
                  project's owner account.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Requires a Pro plan.{" "}
                  <Link
                    href="/settings/billing"
                    onClick={(e) => e.stopPropagation()}
                    className="text-primary underline underline-offset-4 hover:opacity-80"
                  >
                    Upgrade to unlock
                  </Link>
                  .
                </p>
              )}
            </div>
          </div>
          {isUpdating && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-4">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </div>
          )}
        </CardContent>
      </Card>

      <ProjectIdTab projectId={project.id} />
      <ProjectApiKeysTab projectId={project.id} />
      <MembersTab projectId={project.id} />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Delete Project</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this project and all its data.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Project
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your project and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteProject(project.id)}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Delete Project"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

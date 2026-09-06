"use client";

import { useDeleteNewsletter, useUpdateNewsletter } from "@/hooks/use-newsletters";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateNewsletterSchema } from "@workspace/validations";
import type { UpdateNewsletter } from "@workspace/validations";
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
import { CopyButton } from "@workspace/ui/components/copy-button";
import { cn } from "@workspace/ui/lib/utils";
import { Globe, Loader2, Lock, Sparkles, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { ApiKeysTab as NewsletterApiKeysTab } from "./api-keys-tab";
import { MembersTab } from "./members-tab";
import { Textarea } from "@workspace/ui/components/textarea";
import { NewsletterIdTab } from "./newsletter-id-tab";

interface SettingsTabProps {
  newsletter: {
    id: string;
    slug: string;
    name: string;
    description: string;
    isPublic: boolean;
    isPrivateAt: string | null;
    config?: { removeBranding?: boolean } | null;
    /** Computed server-side from the newsletter owner's plan — see routes/api/v1/newsletters.ts's `/slug/:slug`. */
    canRemoveBranding: boolean;
    /** Same gate as `canRemoveBranding` — governs the custom-domains tab, not this newsletter's own URL (see the Public URL field below, unconditional for every plan). */
    canUseCustomDomain: boolean;
  };
}

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

export function SettingsTab({ newsletter }: SettingsTabProps) {
  const router = useRouter();
  const { mutate: updateNewsletter, isPending: isUpdating } =
    useUpdateNewsletter(newsletter.id);
  const { mutate: deleteNewsletter, isPending: isDeleting } =
    useDeleteNewsletter();

  const form = useForm<UpdateNewsletter>({
    resolver: zodResolver(updateNewsletterSchema),
    defaultValues: {
      name: newsletter.name,
      slug: newsletter.slug,
      description: newsletter?.description,
      isPublic: !newsletter.isPrivateAt,
    },
  });

  // Live-updates the public URL preview below as the owner edits the slug,
  // before they've even saved. Slugs have always been globally unique, so
  // this is the whole URL — no username prefix, no plan gate.
  const watchedSlug = useWatch({ control: form.control, name: "slug" });
  const watchedIsPublic = useWatch({ control: form.control, name: "isPublic" });
  const previewUrl = `${WEB_URL}/${watchedSlug || newsletter.slug}`;

  function onSubmit(values: UpdateNewsletter) {
    const nextSlug = values.slug;
    updateNewsletter(values, {
      onSuccess: () => {
        // Re-baseline so "Save Changes" goes back to disabled — isDirty
        // otherwise keeps comparing against the values the form mounted
        // with, not what was just saved.
        form.reset(values);

        // The current URL's `[id]` segment is the *old* slug (see
        // getNewsletterOrFail, which resolves it as slug-or-uuid) — once
        // it changes server-side, that segment 404s on the next fetch, so
        // move the address bar to match before that happens.
        if (nextSlug && nextSlug !== newsletter.slug) {
          router.replace(`/newsletters/${nextSlug}/settings`);
        }
      },
    });
  }

  function toggleBranding(removeBranding: boolean) {
    // "Show branding" (false) is always allowed — only removing it is
    // gated. Guard client-side too so a disabled card can't still fire a
    // request that we already know the server will 400 on.
    if (removeBranding && !newsletter.canRemoveBranding) return;
    updateNewsletter({ removeBranding });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Update your newsletter's general information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6"
              id="newsletter-settings-form"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Newsletter Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Newsletter" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input placeholder="my-awesome-newsletter" {...field} />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Changes this newsletter's URLs, including its public page.
                      Saving redirects you here to match.
                    </p>
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
                          Anyone can view this newsletter, including its public
                          page at the URL below.
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
                          Only you and your team can view this — its public
                          page is taken down too.
                        </p>
                      </div>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <p className="text-sm font-medium">Public URL</p>
                <div className="flex items-center gap-2">
                  <Input readOnly value={previewUrl} className="font-mono text-xs sm:text-sm" />
                  <CopyButton content={previewUrl} />
                </div>
                {!watchedIsPublic && (
                  <p className="text-xs text-muted-foreground">
                    Set to Public above for this to actually be visible.
                  </p>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <Button
            type="submit"
            form="newsletter-settings-form"
            disabled={isUpdating || !form.formState.isDirty}
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
            emails. Requires the newsletter owner to be on a paid plan.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className={cn(
                "cursor-pointer border rounded-lg p-4 flex flex-col gap-2 transition-all hover:border-primary/50",
                !newsletter.config?.removeBranding
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
                !newsletter.canRemoveBranding
                  ? "opacity-60 cursor-not-allowed bg-muted/30"
                  : "cursor-pointer hover:border-primary/50",
                newsletter.config?.removeBranding && newsletter.canRemoveBranding
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "bg-card"
              )}
              onClick={() => toggleBranding(true)}
              aria-disabled={!newsletter.canRemoveBranding}
            >
              <div className="font-medium flex items-center gap-1.5">
                {!newsletter.canRemoveBranding && (
                  <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                Remove branding
              </div>
              {newsletter.canRemoveBranding ? (
                <p className="text-sm text-muted-foreground">
                  No footer. Requires a Pro (or higher) plan on this
                  newsletter's owner account.
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

      <NewsletterIdTab newsletterId={newsletter.id} />
      <NewsletterApiKeysTab newsletterId={newsletter.id} />
      <MembersTab newsletterId={newsletter.id} />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Irreversible actions for your newsletter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-medium">Delete Newsletter</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete this newsletter and all its data.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Newsletter
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    your newsletter and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteNewsletter(newsletter.id)}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Delete Newsletter"
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

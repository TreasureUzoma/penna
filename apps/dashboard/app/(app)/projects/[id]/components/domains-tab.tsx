"use client";

import { useState } from "react";
import {
  useProjectDomains,
  useAddProjectDomain,
  useVerifyProjectDomain,
  useDeleteProjectDomain,
} from "@/hooks/use-domains";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { CopyButton } from "@workspace/ui/components/copy-button";
import { cn } from "@workspace/ui/lib/utils";
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
import {
  Globe,
  Loader2,
  Lock,
  RefreshCw,
  Sparkles,
  Trash2,
  CheckCircle2,
  Clock,
} from "lucide-react";
import Link from "next/link";

interface DomainsTabProps {
  project: {
    id: string;
    /** Computed server-side from the project owner's plan — see routes/api/v1/projects.ts's `/slug/:slug`. */
    canUseCustomDomain: boolean;
  };
}

export function DomainsTab({ project }: DomainsTabProps) {
  const { data: domains, isLoading } = useProjectDomains(project.id);
  const { mutate: addDomain, isPending: isAdding } = useAddProjectDomain(
    project.id
  );
  const { mutate: verifyDomain, isPending: isVerifying } =
    useVerifyProjectDomain(project.id);
  const { mutate: deleteDomain, isPending: isDeleting } =
    useDeleteProjectDomain(project.id);
  const [name, setName] = useState("");
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!project.canUseCustomDomain || !name.trim()) return;
    addDomain(name.trim(), { onSuccess: () => setName("") });
  }

  function handleVerify(domainId: string) {
    setVerifyingId(domainId);
    verifyDomain(domainId, { onSettled: () => setVerifyingId(null) });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Custom Sending Domain
            <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              <Sparkles className="w-3 h-3" />
              Pro
            </span>
          </CardTitle>
          <CardDescription>
            Send newsletters from your own domain (e.g.{" "}
            <span className="font-mono">news.yoursite.com</span>) instead of
            the shared Penna domain. Requires the project owner to be on a
            paid plan.
          </CardDescription>
        </CardHeader>

        {project.canUseCustomDomain ? (
          <>
            <CardContent>
              <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="news.yoursite.com"
                  disabled={isAdding}
                  className="flex-1"
                />
                <Button
                  type="submit"
                  disabled={isAdding || !name.trim()}
                  className="w-full sm:w-auto"
                >
                  {isAdding && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Add Domain
                </Button>
              </form>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 text-sm text-muted-foreground">
              You'll get DNS records to add at your domain registrar — email
              stays on the shared domain until they're verified.
            </CardFooter>
          </>
        ) : (
          <CardContent>
            <div className="border rounded-lg p-4 flex items-start gap-3 bg-muted/30">
              <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Custom domains require a Pro (or higher) plan on this
                project's owner account.{" "}
                <Link
                  href="/settings/billing"
                  className="text-primary underline underline-offset-4 hover:opacity-80"
                >
                  Upgrade to unlock
                </Link>
                .
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {project.canUseCustomDomain && (
        <Card>
          <CardHeader>
            <CardTitle>Your Domains</CardTitle>
            <CardDescription>
              Add the CNAME records below at your DNS provider, then click
              Recheck. DNS changes can take up to 72 hours to propagate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading && (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            )}

            {!isLoading && (!domains || domains.length === 0) && (
              <p className="text-sm text-muted-foreground">
                No custom domains yet.
              </p>
            )}

            {domains?.map((domain) => (
              <div key={domain.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{domain.name}</span>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0",
                        domain.verified
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                      )}
                    >
                      {domain.verified ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {domain.verified ? "Verified" : "Pending"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {!domain.verified && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(domain.id)}
                        disabled={isVerifying && verifyingId === domain.id}
                      >
                        {isVerifying && verifyingId === domain.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Recheck
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isDeleting}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove domain</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove <strong>{domain.name}</strong>? Newsletters
                            will go back to sending from the shared Penna
                            domain.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteDomain(domain.id)}
                            className="bg-destructive text-white hover:bg-destructive/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>

                {!domain.verified && domain.dnsRecords.length > 0 && (
                  <div className="rounded-md bg-muted/50 p-3 space-y-2 overflow-x-auto">
                    <p className="text-xs font-medium text-muted-foreground">
                      Add these CNAME records:
                    </p>
                    {domain.dnsRecords.map((record) => (
                      <div
                        key={record.name}
                        className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 text-xs font-mono items-center"
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate">{record.name}</span>
                          <CopyButton content={record.name} size="sm" />
                        </div>
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="truncate">{record.value}</span>
                          <CopyButton content={record.value} size="sm" />
                        </div>
                        <span className="text-muted-foreground">CNAME</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useAllDomains, useVerifyAnyDomain, useDeleteAnyDomain } from "@/hooks/use-domains";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
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
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
} from "lucide-react";

export default function AccountDomainsPage() {
  const { data: domains, isLoading } = useAllDomains();
  const { mutate: verifyDomain, isPending: isVerifying } = useVerifyAnyDomain();
  const { mutate: deleteDomain, isPending: isDeleting } = useDeleteAnyDomain();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleVerify(projectId: string, domainId: string) {
    setPendingId(domainId);
    verifyDomain({ projectId, domainId }, { onSettled: () => setPendingId(null) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Domains</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every custom sending domain across all your projects, in one place.
          To add a new one, open a project and go to its Domains tab.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Domains</CardTitle>
          <CardDescription>
            Recheck verification or remove a domain without switching
            projects.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {!isLoading && (!domains || domains.length === 0) && (
            <div className="text-center py-10 space-y-3">
              <Globe className="w-8 h-8 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                No custom domains yet. Add one from a project's Domains tab.
              </p>
              <Button asChild variant="outline" size="sm">
                <Link href="/projects">Go to Projects</Link>
              </Button>
            </div>
          )}

          {domains?.map((domain) => (
            <div
              key={domain.id}
              className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
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
                  <Link
                    href={`/projects/${domain.project.slug}/domains`}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-0.5"
                  >
                    {domain.project.name}
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {!domain.verified && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleVerify(domain.project.id, domain.id)}
                    disabled={isVerifying && pendingId === domain.id}
                  >
                    {isVerifying && pendingId === domain.id ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Recheck
                  </Button>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isDeleting}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remove domain</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remove <strong>{domain.name}</strong> from{" "}
                        <strong>{domain.project.name}</strong>? Newsletters
                        will go back to sending from the shared Penna domain.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() =>
                          deleteDomain({
                            projectId: domain.project.id,
                            domainId: domain.id,
                          })
                        }
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Remove
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

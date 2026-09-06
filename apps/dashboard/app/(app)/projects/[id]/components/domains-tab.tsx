"use client";

import { Fragment, useState } from "react";
import {
  useDomains,
  useAddDomain,
  useVerifyDomain,
  useAssignDomain,
  useDeleteDomain,
} from "@/hooks/use-domains";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { CopyButton } from "@workspace/ui/components/copy-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
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
  Plus,
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
  const { data: domains, isLoading } = useDomains(project.id);
  // Unfiltered, just to find domains the user has already verified under
  // their account but hasn't assigned anywhere yet — offered below as
  // "attach an existing domain" instead of re-verifying the same one.
  const { data: allDomains } = useDomains();
  const unassignedDomains = allDomains?.filter((d) => !d.project) ?? [];

  const { mutate: addDomain, isPending: isAdding } = useAddDomain();
  const { mutate: verifyDomain, isPending: isVerifying } = useVerifyDomain();
  const { mutate: assignDomain, isPending: isAssigning } = useAssignDomain();
  const { mutate: deleteDomain, isPending: isDeleting } = useDeleteDomain();

  const [name, setName] = useState("");
  const [attachPick, setAttachPick] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!project.canUseCustomDomain || !name.trim()) return;
    addDomain(
      { name: name.trim(), projectId: project.id },
      { onSuccess: () => setName("") }
    );
  }

  function handleAttach() {
    if (!attachPick) return;
    assignDomain(
      { domainId: attachPick, projectId: project.id },
      { onSuccess: () => setAttachPick("") }
    );
  }

  function handleVerify(domainId: string) {
    setPendingId(domainId);
    verifyDomain(domainId, { onSettled: () => setPendingId(null) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-semibold flex items-center gap-2">
          Custom Sending Domain
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Sparkles className="w-3 h-3" />
            Pro
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Send newsletters from your own domain (e.g.{" "}
          <span className="font-mono">news.yoursite.com</span>) instead of
          the shared Penna domain.
        </p>
      </div>

      {!project.canUseCustomDomain && (
        <div className="border rounded-lg p-4 flex items-start gap-3 bg-muted/30">
          <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">
            Custom domains require a Pro (or higher) plan on this project's
            owner account.{" "}
            <Link
              href="/settings/billing"
              className="text-primary underline underline-offset-4 hover:opacity-80"
            >
              Upgrade to unlock
            </Link>
            .
          </p>
        </div>
      )}

      {project.canUseCustomDomain && (
        <>
          <form
            onSubmit={handleAdd}
            className="flex flex-col sm:flex-row gap-2"
          >
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
              {isAdding ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Domain
            </Button>
          </form>

          {unassignedDomains.length > 0 && (
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center text-sm">
              <span className="text-muted-foreground shrink-0">
                Or attach one you've already verified:
              </span>
              <Select value={attachPick} onValueChange={setAttachPick}>
                <SelectTrigger className="h-8 w-full sm:w-[220px]">
                  <SelectValue placeholder="Choose a domain" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedDomains.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="outline"
                disabled={!attachPick || isAssigning}
                onClick={handleAttach}
              >
                {isAssigning ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Attach"
                )}
              </Button>
            </div>
          )}

          {isLoading && (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          )}

          {!isLoading && (!domains || domains.length === 0) && (
            <div className="text-center py-12 space-y-2">
              <Globe className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                No custom domains yet. Add one above.
              </p>
            </div>
          )}

          {!isLoading && domains && domains.length > 0 && (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Domain</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {domains.map((domain) => (
                    <Fragment key={domain.id}>
                      <TableRow>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            {domain.name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
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
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!domain.verified && (
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Recheck"
                                onClick={() => handleVerify(domain.id)}
                                disabled={
                                  isVerifying && pendingId === domain.id
                                }
                              >
                                {isVerifying && pendingId === domain.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RefreshCw className="w-4 h-4" />
                                )}
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
                                  <AlertDialogTitle>
                                    Remove domain
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Remove <strong>{domain.name}</strong>?
                                    Newsletters will go back to sending from
                                    the shared Penna domain.
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
                        </TableCell>
                      </TableRow>
                      {!domain.verified && domain.dnsRecords.length > 0 && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={3} className="bg-muted/30">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Add these CNAME records at your DNS provider,
                              then click Recheck:
                            </p>
                            <div className="space-y-2 overflow-x-auto">
                              {domain.dnsRecords.map((record) => (
                                <div
                                  key={record.name}
                                  className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 text-xs font-mono items-center"
                                >
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="truncate">
                                      {record.name}
                                    </span>
                                    <CopyButton content={record.name} size="sm" />
                                  </div>
                                  <div className="flex items-center gap-1 min-w-0">
                                    <span className="truncate">
                                      {record.value}
                                    </span>
                                    <CopyButton content={record.value} size="sm" />
                                  </div>
                                  <span className="text-muted-foreground">
                                    CNAME
                                  </span>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

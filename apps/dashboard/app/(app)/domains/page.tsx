"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useDomains,
  useAddDomain,
  useVerifyDomain,
  useAssignDomain,
  useDeleteDomain,
} from "@/hooks/use-domains";
import { useNewsletters } from "@/hooks/use-newsletters";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
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
  RefreshCw,
  Trash2,
  CheckCircle2,
  Clock,
  Plus,
} from "lucide-react";

export default function AccountDomainsPage() {
  const { data: domains, isLoading } = useDomains();
  const { data: newsletters } = useNewsletters();
  const { mutate: addDomain, isPending: isAdding } = useAddDomain();
  const { mutate: verifyDomain, isPending: isVerifying } = useVerifyDomain();
  const { mutate: assignDomain, isPending: isAssigning } = useAssignDomain();
  const { mutate: deleteDomain, isPending: isDeleting } = useDeleteDomain();

  const [name, setName] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  // Per-row "assign to newsletter" picks, keyed by domain id.
  const [assignPicks, setAssignPicks] = useState<Record<string, string>>({});

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    addDomain({ name: name.trim() }, { onSuccess: () => setName("") });
  }

  function handleVerify(domainId: string) {
    setPendingId(domainId);
    verifyDomain(domainId, { onSettled: () => setPendingId(null) });
  }

  function handleAssign(domainId: string) {
    const newsletterId = assignPicks[domainId];
    if (!newsletterId) return;
    setPendingId(domainId);
    assignDomain(
      { domainId, newsletterId },
      { onSettled: () => setPendingId(null) }
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 md:px-8 md:py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Domains</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Verify a domain here, then assign it to a newsletter whenever you're
          ready — or add one straight from a newsletter's Domains tab.
        </p>
      </div>

      <form
        onSubmit={handleAdd}
        className="flex flex-col sm:flex-row gap-2 sm:items-center"
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
          Verify Domain
        </Button>
      </form>

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
                <TableHead>Newsletter</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      {domain.name}
                    </div>
                  </TableCell>
                  <TableCell>
                    {domain.newsletter ? (
                      <Link
                        href={`/newsletters/${domain.newsletter.slug}/domains`}
                        className="text-muted-foreground hover:text-foreground hover:underline"
                      >
                        {domain.newsletter.name}
                      </Link>
                    ) : domain.verified ? (
                      <div className="flex items-center gap-1.5">
                        <Select
                          value={assignPicks[domain.id] ?? ""}
                          onValueChange={(value) =>
                            setAssignPicks((picks) => ({
                              ...picks,
                              [domain.id]: value,
                            }))
                          }
                        >
                          <SelectTrigger className="h-8 w-[160px]">
                            <SelectValue placeholder="Assign to…" />
                          </SelectTrigger>
                          <SelectContent>
                            {newsletters?.map((newsletter) => (
                              <SelectItem key={newsletter.id} value={newsletter.id}>
                                {newsletter.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={
                            !assignPicks[domain.id] ||
                            (isAssigning && pendingId === domain.id)
                          }
                          onClick={() => handleAssign(domain.id)}
                        >
                          {isAssigning && pendingId === domain.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            "Assign"
                          )}
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        Unassigned
                      </span>
                    )}
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
                          disabled={isVerifying && pendingId === domain.id}
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
                            <AlertDialogTitle>Remove domain</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove <strong>{domain.name}</strong>?
                              {domain.newsletter && (
                                <>
                                  {" "}
                                  Newsletters will go back to sending from the
                                  shared Penna domain.
                                </>
                              )}
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
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

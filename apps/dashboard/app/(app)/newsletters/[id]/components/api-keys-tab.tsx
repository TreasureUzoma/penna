import { useState } from "react";
import {
  useNewsletterApiKeys,
  useCreateNewsletterApiKey,
  useDeleteNewsletterApiKey,
} from "@/hooks/use-newsletter-api-keys";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CopyButton } from "@workspace/ui/components/copy-button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { Loader2, Plus, Trash2, Eye, EyeOff, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
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
import { Label } from "@workspace/ui/components/label";
import { cn } from "@workspace/ui/lib/utils";
import { API_KEY_SCOPES, type ApiKeyScope } from "@workspace/validations";

const SCOPE_INFO: Record<
  ApiKeyScope,
  { label: string; description: string }
> = {
  "subscribers:write": {
    label: "Add subscribers",
    description:
      "Add new subscribers to this newsletter — the scope a public signup form needs.",
  },
  "subscribers:read": {
    label: "Read subscribers",
    description:
      "List this newsletter's subscribers. Requires the private key half of the pair.",
  },
  "newsletter:send": {
    label: "Send newsletters",
    description:
      "Send a newsletter to your subscribers. The most powerful scope — requires the private key half, since it can email your whole list.",
  },
};

export function ApiKeysTab({ newsletterId }: { newsletterId: string }) {
  const { data: apiKeys, isLoading } = useNewsletterApiKeys(newsletterId);
  const { mutate: createApiKey, isPending: isCreating } =
    useCreateNewsletterApiKey(newsletterId);
  const { mutate: deleteApiKey, isPending: isDeleting } =
    useDeleteNewsletterApiKey(newsletterId);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([
    ...API_KEY_SCOPES,
  ]);

  const toggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  const handleCreate = () => {
    createApiKey(selectedScopes, {
      onSuccess: (data) => {
        setNewKey(data.secretKey);
        setIsCreateDialogOpen(false);
        setSelectedScopes([...API_KEY_SCOPES]);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0 pb-2">
          <div className="space-y-1">
            <CardTitle>API Keys</CardTitle>
            <CardDescription>
              Manage your API keys for accessing the Penna API. Each key
              created below is a pair: a Public Key you can use in
              client-side code, and a Private Key for privileged,
              server-only requests — scoped to only what you grant it.
            </CardDescription>
          </div>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                Create New Key
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create API Key</DialogTitle>
                <DialogDescription>
                  Choose what this key is allowed to do. You can't change
                  this later — delete the key and create a new one instead.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                {API_KEY_SCOPES.map((scope) => {
                  const info = SCOPE_INFO[scope];
                  const isSelected = selectedScopes.includes(scope);
                  return (
                    <div
                      key={scope}
                      role="checkbox"
                      aria-checked={isSelected}
                      tabIndex={0}
                      onClick={() => toggleScope(scope)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleScope(scope);
                        }
                      }}
                      className={cn(
                        "cursor-pointer border rounded-lg p-3 flex items-start gap-3 transition-all hover:border-primary/50",
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "bg-card"
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                          isSelected
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input"
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{info.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {info.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleCreate}
                  disabled={isCreating || selectedScopes.length === 0}
                >
                  {isCreating && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Create Key
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {apiKeys?.map((key) => (
            <div key={key.id} className="flex flex-col gap-2 border-b pb-4 last:border-0 last:pb-0">
              <div className="flex items-center gap-2">
                <div className="grid flex-1 gap-2">
                  <Label className="text-xs text-muted-foreground">
                    Public Key
                  </Label>
                  <Input readOnly value={key.publicKey} className="font-mono" />
                </div>
                <CopyButton
                  content={key.publicKey}
                  onCopy={() => toast.success("Copied to clipboard")}
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this API key? This action
                        cannot be undone and will immediately revoke access for
                        any application using this key.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteApiKey(key.id)}
                        className="bg-destructive text-white hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(key.scopes ?? []).map((scope) => (
                  <Badge key={scope} variant="secondary" className="text-xs">
                    {SCOPE_INFO[scope]?.label ?? scope}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
          {(!apiKeys || apiKeys.length === 0) && (
            <p className="text-sm text-muted-foreground">No API keys found.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!newKey} onOpenChange={(open) => !open && setNewKey(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Your new key pair has been created. The Public Key is saved in
              the list below, but this Private Key is shown only once — copy
              it now, as you won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Private Key</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    readOnly
                    value={newKey || ""}
                    type={showKey ? "text" : "password"}
                    className="font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <CopyButton
                  content={newKey || ""}
                  onCopy={() => toast.success("Private key copied")}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setNewKey(null);
                setShowKey(false);
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

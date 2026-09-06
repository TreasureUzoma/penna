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
import { Loader2, Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

export function ApiKeysTab({ newsletterId }: { newsletterId: string }) {
  const { data: apiKeys, isLoading } = useNewsletterApiKeys(newsletterId);
  const { mutate: createApiKey, isPending: isCreating } =
    useCreateNewsletterApiKey(newsletterId);
  const { mutate: deleteApiKey, isPending: isDeleting } =
    useDeleteNewsletterApiKey(newsletterId);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const handleCreate = () => {
    createApiKey(undefined, {
      onSuccess: (data) => {
        setNewKey(data.secretKey);
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
              server-only requests.
            </CardDescription>
          </div>
          <Button
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full sm:w-auto"
          >
            {isCreating ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Create New Key
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {apiKeys?.map((key) => (
            <div key={key.id} className="flex items-center gap-2">
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

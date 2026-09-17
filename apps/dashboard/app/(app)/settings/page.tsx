"use client";

import { useGetProfile, useUpdateProfile, useDeleteAccount } from "@/hooks/use-auth";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema } from "@workspace/validations";
import { Loader2, TriangleAlert } from "lucide-react";
import { SettingsLayout } from "./components/settings-layout";
import { useState } from "react";

export default function SettingsPage() {
  const { data: profile, isLoading } = useGetProfile();
  const { mutate: updateProfile, isPending } = useUpdateProfile();
  const { mutate: deleteAccount, isPending: isDeleting } = useDeleteAccount();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");

  const form = useForm({
    resolver: zodResolver(updateProfileSchema),
    values: {
      name: profile?.name || "",
    },
  });

  const onSubmit = (values: any) => {
    updateProfile(values);
  };

  const handleDeleteAccount = () => {
    deleteAccount(confirmEmail, {
      onSettled: () => {
        setDeleteDialogOpen(false);
        setConfirmEmail("");
      },
    });
  };

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your public profile and how people see you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2">
                  <FormLabel>Email</FormLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      value={profile?.email}
                      disabled
                      className="opacity-70 bg-muted"
                    />
                    {false && (
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        disabled
                      >
                        Verified
                      </Button>
                    )}
                    {/* in the future ill make this functional, probably v2*/}
                  </div>
                  <p className="text-[0.8rem] text-muted-foreground">
                    Email cannot be changed currently.
                  </p>
                </div>
                <Button type="submit" disabled={isPending}>
                  {isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Changes
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated newsletters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog
              open={deleteDialogOpen}
              onOpenChange={(open) => {
                setDeleteDialogOpen(open);
                if (!open) setConfirmEmail("");
              }}
            >
              <DialogTrigger asChild>
                <Button variant="destructive">Delete Account</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <TriangleAlert className="h-5 w-5 text-destructive" />
                    Delete your account
                  </DialogTitle>
                  <DialogDescription className="pt-1">
                    This will permanently wipe your account data and all
                    associated newsletters. Your payment history will be
                    retained for billing purposes.
                    <br />
                    <br />
                    Type{" "}
                    <span className="font-semibold text-foreground">
                      {profile?.email}
                    </span>{" "}
                    to confirm.
                  </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                  <Input
                    id="delete-account-confirm-email"
                    type="email"
                    placeholder={profile?.email}
                    value={confirmEmail}
                    onChange={(e) => setConfirmEmail(e.target.value)}
                    disabled={isDeleting}
                    autoComplete="off"
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setConfirmEmail("");
                    }}
                    disabled={isDeleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDeleteAccount}
                    disabled={
                      isDeleting || confirmEmail !== profile?.email
                    }
                  >
                    {isDeleting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Yes, delete my account
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}

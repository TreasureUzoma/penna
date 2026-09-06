"use client";

import {
  useNewsletterMembers,
  useUpdateNewsletterMember,
  useTransferOwnership,
} from "@/hooks/use-newsletter-members";
import { useGetProfile } from "@/hooks/use-auth";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@workspace/ui/components/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Button } from "@workspace/ui/components/button";
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
import { Crown, Loader2 } from "lucide-react";

export function MembersTab({ newsletterId }: { newsletterId: string }) {
  const { data: members, isLoading } = useNewsletterMembers(newsletterId);
  const { mutate: updateRole, isPending } = useUpdateNewsletterMember(newsletterId);
  const { mutate: transferOwnership, isPending: isTransferring } =
    useTransferOwnership(newsletterId);
  const { data: user } = useGetProfile();

  const currentMember = members?.find((m: any) => m.user.email === user?.email);
  const isCurrentUserOwner = currentMember?.role === "owner";

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Members</CardTitle>
        <CardDescription>
          Manage who has access to this newsletter.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {members?.map((member: any) => (
          <div
            key={member.userId}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-center gap-4 min-w-0">
              <Avatar className="shrink-0">
                <AvatarImage
                  src={`https://avatar.idolo.dev/${member.user.email}`}
                />
                <AvatarFallback>{member.user.name?.[0]}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium truncate">{member.user.name}</p>
                <p className="text-sm text-muted-foreground truncate">
                  {member.user.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {isCurrentUserOwner && member.role !== "owner" && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={isTransferring}
                      title="Transfer ownership"
                    >
                      <Crown className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Transfer Ownership</AlertDialogTitle>
                      <AlertDialogDescription>
                        Make <strong>{member.user.name}</strong> the new
                        owner of this newsletter? You'll be moved to the Admin
                        role and lose owner-only permissions (like deleting
                        the newsletter or transferring ownership again).
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => transferOwnership(member.userId)}
                      >
                        Transfer Ownership
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Select
                defaultValue={member.role}
                onValueChange={(value) =>
                  updateRole({ userId: member.userId, role: value })
                }
                disabled={
                  isPending ||
                  member.user.email === user?.email ||
                  member.role === "owner"
                }
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

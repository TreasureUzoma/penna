"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useTeams,
  useTeamMembers,
  useUpdateTeamMemberRole,
  useTransferTeamOwnership,
  useInviteToTeam,
  useCreateTeam,
} from "@/hooks/use-teams";
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
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Crown, Loader2, Plus, UserPlus } from "lucide-react";
import type { TeamRoles } from "@workspace/types";

function CreateTeamDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { mutate: createTeam, isPending } = useCreateTeam();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Team
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a team</DialogTitle>
          <DialogDescription>
            A team owns newsletters and its members — you'll be its owner.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="team-name">Name</Label>
            <Input
              id="team-name"
              placeholder="Acme Inc."
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) {
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]+/g, "-")
                      .replace(/^-+|-+$/g, "")
                  );
                }
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="team-slug">Slug</Label>
            <Input
              id="team-slug"
              placeholder="acme-inc"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={isPending || !name.trim() || slug.length < 3}
            onClick={() =>
              createTeam(
                { name: name.trim(), slug },
                {
                  onSuccess: () => {
                    setOpen(false);
                    setName("");
                    setSlug("");
                  },
                }
              )
            }
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function TeamSettingsPage() {
  return (
    <Suspense fallback={null}>
      <TeamSettingsContent />
    </Suspense>
  );
}

function TeamSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: teams, isLoading: isLoadingTeams } = useTeams();

  const requestedSlug = searchParams.get("team");
  const activeTeam =
    (requestedSlug
      ? teams?.find((t) => t.slug === requestedSlug)
      : undefined) ?? teams?.[0];

  const { data: members, isLoading: isLoadingMembers } = useTeamMembers(
    activeTeam?.id ?? ""
  );
  const { mutate: updateRole, isPending: isUpdatingRole } =
    useUpdateTeamMemberRole(activeTeam?.id ?? "");
  const { mutate: transferOwnership, isPending: isTransferring } =
    useTransferTeamOwnership(activeTeam?.id ?? "");
  const { mutate: inviteToTeam, isPending: isInviting } = useInviteToTeam(
    activeTeam?.id ?? ""
  );

  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRoles>("viewer");

  if (isLoadingTeams) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (!activeTeam) {
    return (
      <p className="text-sm text-muted-foreground">
        You're not on any team yet.
      </p>
    );
  }

  const isOwnerOrAdmin =
    activeTeam.role === "owner" || activeTeam.role === "admin";

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    inviteToTeam(
      { email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: () => {
          setIsInviteDialogOpen(false);
          setInviteEmail("");
          setInviteRole("viewer");
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        {teams && teams.length > 1 ? (
          <div className="flex items-center gap-2">
            <Label className="text-sm text-muted-foreground shrink-0">Team</Label>
            <Select
              value={activeTeam.slug}
              onValueChange={(slug) => router.push(`/settings/team?team=${slug}`)}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.slug}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div />
        )}
        <CreateTeamDialog />
      </div>

      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>{activeTeam.name}</CardTitle>
            <CardDescription>
              Manage who's on this team — every member has access to every
              newsletter it owns.
            </CardDescription>
          </div>
          {isOwnerOrAdmin && (
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full sm:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Invite Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite to {activeTeam.name}</DialogTitle>
                  <DialogDescription>
                    We'll email them a link to accept — they don't need an
                    account yet.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="teammate@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={inviteRole}
                      onValueChange={(v) => setInviteRole(v as TeamRoles)}
                    >
                      <SelectTrigger id="invite-role" className="w-full">
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
                <DialogFooter>
                  <Button
                    onClick={handleInvite}
                    disabled={isInviting || !inviteEmail.trim()}
                  >
                    {isInviting && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Send Invite
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingMembers ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            members?.map((member) => (
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
                  {activeTeam.role === "owner" && member.role !== "owner" && (
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
                            owner of {activeTeam.name}? You'll be moved to the
                            Admin role and lose owner-only permissions (like
                            deleting the team or transferring ownership
                            again).
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
                      updateRole({
                        userId: member.userId,
                        role: value as TeamRoles,
                      })
                    }
                    disabled={
                      isUpdatingRole ||
                      !isOwnerOrAdmin ||
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
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

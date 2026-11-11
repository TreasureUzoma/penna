"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useTeamMembers,
  useUpdateTeamMemberRole,
  useTransferTeamOwnership,
  useInviteToTeam,
  useCreateTeam,
  useRemoveTeamMember,
  useDeleteTeam,
} from "@/hooks/use-teams";
import {
  setActiveTeamSlug,
  useActiveTeam,
} from "@/hooks/use-active-team";
import { useTeamSubscription } from "@/hooks/use-team-billing";
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
import { Loader2, Trash2 } from "lucide-react";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@workspace/ui/components/alert";
import type { TeamRoles } from "@workspace/types";
import {
  AlertTriangle,
  CrownIcon,
  PlusIcon,
  UserMinusIcon,
  UserPlus,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

function CreateTeamDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const { mutate: createTeam, isPending } = useCreateTeam();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full sm:w-auto">
          <HugeiconsIcon icon={PlusIcon} className="w-4 h-4 mr-2" />
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
                      .replace(/^-+|-+$/g, ""),
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
                  onSuccess: (result) => {
                    const newTeamSlug = result?.data?.team?.slug;
                    if (newTeamSlug) {
                      setActiveTeamSlug(newTeamSlug);
                      router.push(`/settings/team?team=${newTeamSlug}`);
                    }
                    setOpen(false);
                    setName("");
                    setSlug("");
                  },
                },
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
  const {
    teams,
    activeTeam: savedActiveTeam,
    setActiveTeam,
    isLoading: isLoadingTeams,
  } = useActiveTeam();

  const requestedSlug = searchParams.get("team");
  const activeTeam =
    (requestedSlug
      ? teams?.find((t) => t.slug === requestedSlug)
      : undefined) ?? savedActiveTeam;

  const { data: members, isLoading: isLoadingMembers } = useTeamMembers(
    activeTeam?.id ?? "",
  );
  const { mutate: updateRole, isPending: isUpdatingRole } =
    useUpdateTeamMemberRole(activeTeam?.id ?? "");
  const { mutate: transferOwnership, isPending: isTransferring } =
    useTransferTeamOwnership(activeTeam?.id ?? "");
  const { mutate: inviteToTeam, isPending: isInviting } = useInviteToTeam(
    activeTeam?.id ?? "",
  );
  const { mutate: removeMember, isPending: isRemoving } = useRemoveTeamMember(
    activeTeam?.id ?? "",
  );
  const { mutate: deleteTeam, isPending: isDeletingTeam } = useDeleteTeam();
  const { data: billing } = useTeamSubscription(activeTeam?.id ?? "");

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

  const memberCap = billing?.plan.maxTeamMembers ?? null;
  const isOverCap =
    memberCap !== null && !!members && members.length > memberCap;
  const isAtOrOverCap =
    memberCap !== null && !!members && members.length >= memberCap;

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
      },
    );
  };

  return (
    <div className="min-h-screen min-w-0 w-full px-3 py-5 sm:px-4 sm:py-6 md:px-8 md:py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {teams && teams.length > 1 ? (
          <div className="flex w-full sm:w-auto items-center gap-2">
            <Label className="text-sm text-muted-foreground shrink-0">
              Team
            </Label>
            <Select
              value={activeTeam.slug}
              onValueChange={(slug) => {
                const team = teams.find((candidate) => candidate.slug === slug);
                if (team) setActiveTeam(team);
                router.push(`/settings/team?team=${slug}`);
              }}
            >
              <SelectTrigger className="min-w-0 flex-1 sm:w-64 sm:flex-none">
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
        <div className="w-full sm:w-auto">
          <CreateTeamDialog />
        </div>
      </div>

      {isOverCap && (
        <Alert variant="destructive">
          <HugeiconsIcon icon={AlertTriangle} className="w-4 h-4" />
          <AlertTitle>
            Over the {billing?.plan.name} plan's member limit
          </AlertTitle>
          <AlertDescription>
            {activeTeam.name} has {members?.length} members, but its plan only
            includes {memberCap}. Existing members keep their access, but you
            can't invite anyone new until you remove a member{" "}
            {isOwnerOrAdmin && (
              <>
                or{" "}
                <a href="/settings/billing" className="underline">
                  upgrade the plan
                </a>
              </>
            )}
            .
          </AlertDescription>
        </Alert>
      )}

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
            <Dialog
              open={isInviteDialogOpen}
              onOpenChange={setIsInviteDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  className="w-full sm:w-auto"
                  disabled={isAtOrOverCap}
                  title={
                    isAtOrOverCap
                      ? `This team is at its ${billing?.plan.name} plan's limit of ${memberCap} members`
                      : undefined
                  }
                >
                  <HugeiconsIcon icon={UserPlus} className="w-4 h-4 mr-2" />
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
                <div className="flex max-w-full flex-wrap items-center justify-end gap-2 self-end sm:self-auto">
                  {activeTeam.role === "owner" && member.role !== "owner" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isTransferring}
                          title="Transfer ownership"
                        >
                          <HugeiconsIcon
                            icon={CrownIcon}
                            className="w-4 h-4 text-muted-foreground hover:text-primary"
                          />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Transfer Ownership
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Make <strong>{member.user.name}</strong> the new
                            owner of {activeTeam.name}? You'll be moved to the
                            Admin role and lose owner-only permissions (like
                            deleting the team or transferring ownership again).
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
                  {isOwnerOrAdmin && member.role !== "owner" && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isRemoving}
                          title="Remove from team"
                        >
                          <HugeiconsIcon
                            icon={UserMinusIcon}
                            className="w-4 h-4 text-muted-foreground hover:text-destructive"
                          />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove member</AlertDialogTitle>
                          <AlertDialogDescription>
                            Remove <strong>{member.user.name}</strong> from{" "}
                            {activeTeam.name}? They'll lose access to every
                            newsletter this team owns. This also frees up a seat
                            on the team's subscription, if it has one.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => removeMember(member.userId)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {activeTeam.role === "owner" && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Delete team</CardTitle>
            <CardDescription>
              Permanently delete {activeTeam.name} and the newsletters and
              content it owns.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeletingTeam}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete team
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete {activeTeam.name}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes the team, its newsletters,
                    subscribers, posts, API keys, and team members. This cannot
                    be undone. Any active Paddle subscription must be canceled
                    before the team can be deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep team</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={isDeletingTeam}
                    onClick={(event) => {
                      event.preventDefault();
                      deleteTeam(activeTeam.id, {
                        onSuccess: () => {
                          const nextTeam = teams.find(
                            (team) => team.id !== activeTeam.id,
                          );
                          setActiveTeam(nextTeam ?? null);
                          router.push("/newsletters");
                        },
                      });
                    }}
                  >
                    {isDeletingTeam && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Delete team permanently
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

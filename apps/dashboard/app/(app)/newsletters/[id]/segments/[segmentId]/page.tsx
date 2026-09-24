"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  useSegments,
  useSegmentSubscribers,
  useAddSubscriberToSegment,
  useRemoveSubscriberFromSegment,
  useDeleteSegment,
} from "@/hooks/use-segments";
import { useSubscribers } from "@/hooks/use-subscribers";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Loader2 } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import Link from "next/link";
import { SubscriberAvatar } from "@/components/subscriber-avatar";
import { toast } from "sonner";
import { CopyButton } from "@workspace/ui/components/copy-button";
import {
  ArrowLeft01Icon,
  PlusIcon,
  Search01Icon,
  TrashIcon,
  UsersRoundIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function SegmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const newsletterId = params.id as string;
  const segmentId = params.segmentId as string;

  const [page, setPage] = useState(1);
  const [availablePage, setAvailablePage] = useState(1);

  const { data: segments, isLoading: isLoadingSegments } =
    useSegments(newsletterId);
  const { data: membersData, isLoading: isLoadingMembers } =
    useSegmentSubscribers(newsletterId, segmentId, page);
  const { data: subscribersData } = useSubscribers(newsletterId, availablePage);
  const { mutate: addSubscriber, isPending: isAdding } =
    useAddSubscriberToSegment(newsletterId);
  const { mutate: removeSubscriber } =
    useRemoveSubscriberFromSegment(newsletterId);
  const { mutate: deleteSegment, isPending: isDeleting } =
    useDeleteSegment(newsletterId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const segment = segments?.find((s) => s.id === segmentId);
  const members = membersData?.data || [];
  const membersMeta = membersData?.meta;

  const memberIds = new Set(members.map((m) => m.id));
  const availableSubscribers = (subscribersData?.data || []).filter(
    (s) => !memberIds.has(s.id),
  );

  const filteredAvailable = availableSubscribers.filter(
    (s) =>
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleAddSubscriber = (subscriberId: string) => {
    addSubscriber(
      { segmentId, subscriberId },
      {
        onSuccess: () => {
          setSearchQuery("");
        },
      },
    );
  };

  const handleDeleteSegment = () => {
    deleteSegment(segmentId, {
      onSuccess: () => {
        router.push(`/newsletters/${newsletterId}/segments`);
      },
    });
  };

  if (isLoadingSegments) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!segment) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <p className="text-muted-foreground">Segment not found</p>
        <Button asChild variant="outline">
          <Link href={`/newsletters/${newsletterId}/segments`}>
            <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4 mr-2" />
            Back to Segments
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              className="h-8 w-8 flex-shrink-0"
            >
              <Link href={`/newsletters/${newsletterId}/segments`}>
                <HugeiconsIcon icon={ArrowLeft01Icon} className="w-4 h-4" />
              </Link>
            </Button>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg md:text-xl font-medium truncate">
                {segment.name}
              </h1>
              {segment.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {segment.description}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-initial">
                <HugeiconsIcon icon={PlusIcon} className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Subscribers</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-[550px] max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-base sm:text-lg">
                  Add Subscribers to {segment.name}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Select subscribers to add to this segment
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                <div className="relative flex-shrink-0">
                  <HugeiconsIcon
                    icon={Search01Icon}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
                  />
                  <Input
                    placeholder="Search subscribers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 rounded-md border p-2 min-h-0">
                  {filteredAvailable.length > 0 ? (
                    filteredAvailable.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 text-sm py-2 px-2 sm:px-3 rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <SubscriberAvatar name={s.name} email={s.email} />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate text-xs sm:text-sm">
                              {s.email}
                            </p>
                            {s.name && (
                              <p className="text-xs text-muted-foreground truncate">
                                {s.name}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={isAdding}
                          onClick={() => handleAddSubscriber(s.id)}
                          className="flex-shrink-0"
                        >
                          <HugeiconsIcon
                            icon={PlusIcon}
                            className="w-4 h-4 sm:mr-1"
                          />
                          <span className="hidden sm:inline">Add</span>
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center px-4">
                      {searchQuery
                        ? "No subscribers found matching your search"
                        : "All subscribers are already in this segment"}
                    </p>
                  )}
                </div>
                {subscribersData?.meta && (
                  <div className="flex items-center justify-between border-t pt-3 flex-shrink-0">
                    <div className="text-sm text-muted-foreground">
                      Page {subscribersData.meta.page} of{" "}
                      {subscribersData.meta.totalPages}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setAvailablePage((p) => Math.max(1, p - 1))
                        }
                        disabled={!subscribersData.meta.hasPrevPage}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAvailablePage((p) => p + 1)}
                        disabled={!subscribersData.meta.hasNextPage}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="icon"
                className="flex-shrink-0"
              >
                <HugeiconsIcon icon={TrashIcon} className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Segment</AlertDialogTitle>
                <AlertDialogDescription className="text-sm">
                  Are you sure you want to delete "{segment.name}"? This won't
                  remove or unsubscribe any subscribers, but this action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="m-0">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteSegment}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90 m-0"
                >
                  {isDeleting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Delete Segment
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Segment ID */}
      <div className="flex items-center gap-2 flex-wrap">
        <p className="font-bold">Segment ID: </p>
        <code className="text-xs bg-muted px-2 py-1 rounded break-all">
          {segment.id}
        </code>
        <CopyButton content={segment.id} />
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HugeiconsIcon icon={UsersRoundIcon} className="w-5 h-5" />
            Segment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
              <p className="text-2xl font-bold">{membersMeta?.total ?? 0}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Created</p>
              <p className="text-lg font-medium">
                {new Date(segment.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="text-lg font-medium">
                {new Date(segment.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscribers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Subscribers in this Segment</CardTitle>
          <CardDescription>
            Manage subscribers who belong to this segment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingMembers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : members && members.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <SubscriberAvatar name={null} email={member.email} />
                          {member.email}
                        </div>
                      </TableCell>
                      <TableCell>{new Date().toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <HugeiconsIcon
                                icon={TrashIcon}
                                className="w-4 h-4 text-muted-foreground hover:text-destructive"
                              />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Remove from Segment
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove {member.email}{" "}
                                from this segment? They will remain subscribed
                                to your newsletter.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() =>
                                  removeSubscriber({
                                    segmentId,
                                    subscriberId: member.id,
                                  })
                                }
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remove
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination Controls for Members */}
              {membersMeta && membersMeta.totalPages > 1 && (
                <div className="flex items-center justify-end space-x-2 py-4">
                  <div className="text-sm text-muted-foreground flex-1">
                    Page {membersMeta.page} of {membersMeta.totalPages}
                  </div>
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={!membersMeta.hasPrevPage}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => p + 1)}
                      disabled={!membersMeta.hasNextPage}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <HugeiconsIcon
                icon={UsersRoundIcon}
                className="w-12 h-12 text-muted-foreground mb-4"
              />
              <p className="text-muted-foreground mb-4">
                No subscribers in this segment yet
              </p>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <HugeiconsIcon icon={PlusIcon} className="w-4 h-4 mr-2" />
                Add subscribers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

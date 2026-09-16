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
import { Loader2, Plus, Trash2, ArrowLeft, Users, Search } from "lucide-react";
import { Input } from "@workspace/ui/components/input";
import Link from "next/link";
import { SubscriberAvatar } from "@/components/subscriber-avatar";

export default function SegmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const newsletterId = params.id as string;
  const segmentId = params.segmentId as string;

  const { data: segments, isLoading: isLoadingSegments } =
    useSegments(newsletterId);
  const { data: members, isLoading: isLoadingMembers } = useSegmentSubscribers(
    newsletterId,
    segmentId,
  );
  const { data: subscribersData } = useSubscribers(newsletterId, 1, 1000);
  const { mutate: addSubscriber, isPending: isAdding } =
    useAddSubscriberToSegment(newsletterId);
  const { mutate: removeSubscriber } =
    useRemoveSubscriberFromSegment(newsletterId);
  const { mutate: deleteSegment, isPending: isDeleting } =
    useDeleteSegment(newsletterId);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const segment = segments?.find((s) => s.id === segmentId);

  const memberIds = new Set((members || []).map((m) => m.id));
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
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Segments
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="h-8 w-8">
              <Link href={`/newsletters/${newsletterId}/segments`}>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{segment.name}</h1>
              {segment.description && (
                <p className="text-muted-foreground">{segment.description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Subscribers
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>Add Subscribers to {segment.name}</DialogTitle>
                <DialogDescription>
                  Select subscribers to add to this segment
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search subscribers..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="max-h-[400px] overflow-y-auto space-y-1 rounded-md border p-2">
                  {filteredAvailable.length > 0 ? (
                    filteredAvailable.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-sm py-2 px-3 rounded hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <SubscriberAvatar name={s.name} email={s.email} />
                          <div>
                            <p className="font-medium">{s.email}</p>
                            {s.name && (
                              <p className="text-xs text-muted-foreground">
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
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground py-8 text-center">
                      {searchQuery
                        ? "No subscribers found matching your search"
                        : "All subscribers are already in this segment"}
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Segment</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete "{segment.name}"? This won't
                  remove or unsubscribe any subscribers, but this action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteSegment}
                  disabled={isDeleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Segment Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
              <p className="text-2xl font-bold">{members?.length ?? 0}</p>
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
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>
                              Remove from Segment
                            </AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.email}{" "}
                              from this segment? They will remain subscribed to
                              your newsletter.
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
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                No subscribers in this segment yet
              </p>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add subscribers
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import {
  useSegments,
  useCreateSegment,
  useDeleteSegment,
  useSegmentSubscribers,
  useAddSubscriberToSegment,
  useRemoveSubscriberFromSegment,
  type Segment,
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
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
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
import { Loader2, Plus, Trash2, Users, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import { createSegmentSchema, CreateSegment } from "@workspace/validations";

function ManageSegmentDialog({
  newsletterId,
  segment,
  open,
  onOpenChange,
}: {
  newsletterId: string;
  segment: Segment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: members, isLoading: isLoadingMembers } = useSegmentSubscribers(
    newsletterId,
    segment.id
  );
  const { data: subscribersData } = useSubscribers(newsletterId, 1, 100);
  const { mutate: addSubscriber, isPending: isAdding } =
    useAddSubscriberToSegment(newsletterId);
  const { mutate: removeSubscriber, isPending: isRemoving } =
    useRemoveSubscriberFromSegment(newsletterId);

  const memberIds = new Set((members || []).map((m) => m.id));
  const available = (subscribersData?.data || []).filter(
    (s) => !memberIds.has(s.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{segment.name}</DialogTitle>
          <DialogDescription>
            Manage which subscribers belong to this segment.
          </DialogDescription>
        </DialogHeader>

        {isLoadingMembers ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">
                In segment ({members?.length ?? 0})
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
                {members && members.length > 0 ? (
                  members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                    >
                      <span>{m.email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={isRemoving}
                        onClick={() =>
                          removeSubscriber({
                            segmentId: segment.id,
                            subscriberId: m.id,
                          })
                        }
                      >
                        <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2 px-2">
                    No subscribers in this segment yet.
                  </p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">
                Add subscribers ({available.length} available)
              </p>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border p-2">
                {available.length > 0 ? (
                  available.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between text-sm py-1 px-2 rounded hover:bg-muted/50"
                    >
                      <span>{s.email}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        disabled={isAdding}
                        onClick={() =>
                          addSubscriber({
                            segmentId: segment.id,
                            subscriberId: s.id,
                          })
                        }
                      >
                        <Plus className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground py-2 px-2">
                    All subscribers are already in this segment.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function NewsletterSegmentsPage() {
  const params = useParams();
  const newsletterId = params.id as string;
  const { data: segments, isLoading } = useSegments(newsletterId);
  const { mutate: createSegment, isPending: isCreating } =
    useCreateSegment(newsletterId);
  const { mutate: deleteSegment } = useDeleteSegment(newsletterId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [managingSegment, setManagingSegment] = useState<Segment | null>(
    null
  );

  const form = useForm<CreateSegment>({
    resolver: zodResolver(createSegmentSchema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = (values: CreateSegment) => {
    createSegment(
      { name: values.name, description: values.description || undefined },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          Group subscribers together to target them with specific emails.
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              New Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Create Segment</DialogTitle>
              <DialogDescription>
                Segments let you group subscribers for targeted sends.
              </DialogDescription>
            </DialogHeader>
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
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Power users" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Subscribers who opened 5+ emails"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button type="submit" disabled={isCreating} className="w-full">
                    {isCreating && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Create Segment
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Segments</CardTitle>
          <CardDescription>
            A list of all subscriber segments for this newsletter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {segments && segments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Subscribers</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {segments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell className="font-medium">
                      {segment.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {segment.description || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {segment.subscriberCount}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(segment.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setManagingSegment(segment)}
                      >
                        <Users className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Segment</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{segment.name}
                              "? This won't remove or unsubscribe any
                              subscribers.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSegment(segment.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
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
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">No segments found.</p>
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create your first segment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {managingSegment && (
        <ManageSegmentDialog
          newsletterId={newsletterId}
          segment={managingSegment}
          open={!!managingSegment}
          onOpenChange={(open) => !open && setManagingSegment(null)}
        />
      )}
    </div>
  );
}

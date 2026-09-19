"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
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
import { Loader2, Plus, Trash2, Users, X, Eye } from "lucide-react";
import Link from "next/link";
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

export default function NewsletterSegmentsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const newsletterId = params.id as string;
  const { data: segments, isLoading } = useSegments(newsletterId);
  const { mutate: createSegment, isPending: isCreating } =
    useCreateSegment(newsletterId);
  const { mutate: deleteSegment } = useDeleteSegment(newsletterId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [managingSegment, setManagingSegment] = useState<Segment | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open && searchParams.get("action") === "new") {
      // Remove the action param when closing the modal using replace to avoid adding to history
      router.replace(`/newsletters/${newsletterId}/segments`);
    }
  };

  const form = useForm<CreateSegment>({
    resolver: zodResolver(createSegmentSchema),
    defaultValues: { name: "", description: "" },
  });

  const onSubmit = (values: CreateSegment) => {
    createSegment(
      { name: values.name, description: values.description || undefined },
      {
        onSuccess: () => {
          handleDialogChange(false);
          form.reset();
        },
      },
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
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
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
                  <Button
                    type="submit"
                    disabled={isCreating}
                    className="w-full"
                  >
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
                      <Button variant="ghost" size="icon" asChild>
                        <Link
                          href={`/newsletters/${newsletterId}/segments/${segment.id}`}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground hover:text-primary" />
                        </Link>
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
    </div>
  );
}

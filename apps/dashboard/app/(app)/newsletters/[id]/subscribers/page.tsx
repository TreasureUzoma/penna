"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  useSubscribers,
  useCreateSubscriber,
  useDeleteSubscriber,
  useImportSubscribers,
} from "@/hooks/use-subscribers";
import { useSegments } from "@/hooks/use-segments";
import { useAddSubscriberToSegment } from "@/hooks/use-segments";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
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
import {
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  BookOpen,
  Code,
  Upload,
  FileText,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  createNewsletterSubscriberSchema,
  CreateSubscriber,
} from "@workspace/validations";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import Link from "next/link";
import { SubscriberAvatar } from "@/components/subscriber-avatar";

export default function NewsletterSubscribersPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const newsletterId = params.id as string;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSubscribers(newsletterId, page);
  const { mutate: createSubscriber, isPending: isCreating } =
    useCreateSubscriber(newsletterId);
  const { mutate: deleteSubscriber, isPending: isDeleting } =
    useDeleteSubscriber(newsletterId);
  const { mutate: importSubscribers, isPending: isImporting } =
    useImportSubscribers(newsletterId);
  const { data: segments } = useSegments(newsletterId);
  const { mutate: addSubscriberToSegment } =
    useAddSubscriberToSegment(newsletterId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSegments, setSelectedSegments] = useState<string[]>([]);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (searchParams.get("action") === "new") {
      setIsDialogOpen(true);
    }
  }, [searchParams]);

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open && searchParams.get("action") === "new") {
      // Remove the action param when closing the modal using replace to avoid adding to history
      router.replace(`/newsletters/${newsletterId}/subscribers`);
    }
  };

  const subscribers = data?.data || [];
  const meta = data?.meta;

  const form = useForm<CreateSubscriber>({
    resolver: zodResolver(createNewsletterSubscriberSchema),
    defaultValues: {
      email: "",
      name: "",
      newsletterId,
    },
  });

  const onSubmit = (values: CreateSubscriber) => {
    createSubscriber(
      {
        email: values.email,
        name: values.name || undefined,
      },
      {
        onSuccess: (subscriber) => {
          // Add subscriber to selected segments
          if (selectedSegments.length > 0 && subscriber) {
            selectedSegments.forEach((segmentId) => {
              addSubscriberToSegment({
                segmentId,
                subscriberId: subscriber.id,
              });
            });
          }
          handleDialogChange(false);
          setSelectedSegments([]);
          form.reset();
        },
      },
    );
  };

  const handleSegmentToggle = (segmentId: string) => {
    setSelectedSegments((prev) =>
      prev.includes(segmentId)
        ? prev.filter((id) => id !== segmentId)
        : [...prev, segmentId],
    );
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const csvContent = reader.result as string;
      importSubscribers(csvContent, {
        onSuccess: () => {
          handleDialogChange(false);
          setCsvFileName(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
        },
      });
    };
    reader.readAsText(file);
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
          Manage your newsletter subscribers.
        </p>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Add Subscribers</DialogTitle>
              <DialogDescription>
                Choose how you want to add new subscribers to your newsletter.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual" className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Manual
                </TabsTrigger>
                <TabsTrigger value="csv" className="gap-2">
                  <Upload className="w-4 h-4" />
                  CSV Import
                </TabsTrigger>
                <TabsTrigger value="api" className="gap-2">
                  <Code className="w-4 h-4" />
                  API Docs
                </TabsTrigger>
              </TabsList>

              {/* Manual Tab */}
              <TabsContent value="manual" className="space-y-4">
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="subscriber@example.com"
                              type="email"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {segments && segments.length > 0 && (
                      <div className="space-y-3">
                        <Label>Add to Segments (Optional)</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto rounded-md border p-3">
                          {segments.map((segment) => (
                            <div
                              key={segment.id}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`segment-${segment.id}`}
                                checked={selectedSegments.includes(segment.id)}
                                onCheckedChange={() =>
                                  handleSegmentToggle(segment.id)
                                }
                              />
                              <label
                                htmlFor={`segment-${segment.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {segment.name}
                              </label>
                            </div>
                          ))}
                        </div>
                        <FormDescription>
                          Select which segments this subscriber should be added
                          to
                        </FormDescription>
                      </div>
                    )}

                    <DialogFooter>
                      <Button
                        type="submit"
                        disabled={isCreating}
                        className="w-full"
                      >
                        {isCreating && (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        )}
                        Add Subscriber
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </TabsContent>

              {/* CSV Import Tab */}
              <TabsContent value="csv" className="space-y-4">
                <div className="space-y-4">
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-sm font-medium mb-1">Upload CSV File</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      CSV should have columns: email, name (optional)
                    </p>
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleCsvFileChange}
                      disabled={isImporting}
                      className="cursor-pointer"
                    />
                    {csvFileName && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Selected: {csvFileName}
                      </p>
                    )}
                  </div>
                  {isImporting && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Importing subscribers...</span>
                    </div>
                  )}
                  <div className="rounded-lg bg-muted/50 p-4 text-sm">
                    <p className="font-medium mb-2">CSV Format Example:</p>
                    <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
                      {`email,name
subscriber@example.com,John Doe
another@example.com,Jane Smith`}
                    </pre>
                  </div>
                </div>
              </TabsContent>

              {/* API Docs Tab */}
              <TabsContent value="api" className="space-y-4">
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-start gap-3">
                      <Code className="w-5 h-5 mt-0.5 text-muted-foreground" />
                      <div className="space-y-2 flex-1">
                        <p className="text-sm font-medium">
                          Use our API to add subscribers programmatically
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Perfect for integrating with your existing systems,
                          forms, or automation workflows.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">API Endpoint</span>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <code className="text-xs break-all">
                        POST /api/v1/newsletters/{newsletterId}/subscribers
                      </code>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Request Body</span>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <pre className="text-xs overflow-x-auto">
                        {JSON.stringify(
                          {
                            email: "subscriber@example.com",
                            name: "John Doe (optional)",
                          },
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href="/docs/api/subscribers"
                      target="_blank"
                      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                    >
                      <BookOpen className="w-4 h-4" />
                      View Full API Documentation
                    </Link>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscribers</CardTitle>
          <CardDescription>
            A list of all users subscribed to your newsletter.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscribers && subscribers.length > 0 ? (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscribers.map((subscriber) => (
                    <TableRow key={subscriber.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <SubscriberAvatar
                            name={subscriber.name}
                            email={subscriber.email}
                          />
                          {subscriber.email}
                        </div>
                      </TableCell>
                      <TableCell>{subscriber.name || "-"}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                          {subscriber.status}
                        </span>
                      </TableCell>
                      <TableCell>
                        {new Date(subscriber.createdAt).toLocaleDateString()}
                      </TableCell>
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
                                Delete Subscriber
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to remove this subscriber?
                                They will no longer receive emails from this
                                newsletter.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteSubscriber(subscriber.id)}
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

              {/* Pagination Controls */}
              <div className="flex items-center justify-end space-x-2 py-4">
                <div className="text-sm text-muted-foreground flex-1">
                  Page {meta?.page ?? 1} of {meta?.totalPages ?? 1}
                </div>
                <div className="space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!meta?.hasPrevPage}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={!meta?.hasNextPage}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground mb-4">
                No subscribers found.
              </p>
              <Button
                variant="outline"
                onClick={() => handleDialogChange(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add your first subscriber
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

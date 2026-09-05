"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  useSubscribers,
  useCreateSubscriber,
  useDeleteSubscriber,
  useImportSubscribers,
} from "@/hooks/use-subscribers";
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
  Zap,
  Upload,
  FileText,
} from "lucide-react";
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
import {
  createProjectSubscriberSchema,
  CreateSubscriber,
} from "@workspace/validations";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import Link from "next/link";

export default function ProjectSubscribersPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSubscribers(projectId, page);
  const { mutate: createSubscriber, isPending: isCreating } =
    useCreateSubscriber(projectId);
  const { mutate: deleteSubscriber, isPending: isDeleting } =
    useDeleteSubscriber(projectId);
  const { mutate: importSubscribers, isPending: isImporting } =
    useImportSubscribers(projectId);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const subscribers = data?.data || [];
  const meta = data?.meta;

  const form = useForm<CreateSubscriber>({
    resolver: zodResolver(createProjectSubscriberSchema),
    defaultValues: {
      email: "",
      name: "",
      projectId,
    },
  });

  const onSubmit = (values: CreateSubscriber) => {
    createSubscriber(
      {
        email: values.email,
        name: values.name || undefined,
      },
      {
        onSuccess: () => {
          setIsDialogOpen(false);
          form.reset();
        },
      }
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
          setIsDialogOpen(false);
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
          Manage your project subscribers.
        </p>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Subscriber
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add Subscriber</DialogTitle>
              <DialogDescription>
                Choose how you want to add new subscribers to your project.
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
                  Import CSV
                </TabsTrigger>
                <TabsTrigger value="api" className="gap-2">
                  <Code className="w-4 h-4" />
                  API / Devs
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-4 pt-4">
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
                            <Input placeholder="john@example.com" {...field} />
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

              <TabsContent value="csv" className="space-y-4 pt-4">
                <div className="bg-muted/50 rounded-xl p-6 space-y-4 border border-dashed">
                  <div className="p-3 bg-background rounded-lg w-fit border shadow-sm">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-base">
                      Import from CSV
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Upload a CSV file with an <code>email</code> column
                      (and an optional <code>name</code> column). Duplicate
                      and invalid rows are skipped automatically.
                    </p>
                  </div>
                  <div className="pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,text/csv"
                      onChange={handleCsvFileChange}
                      className="hidden"
                      id="csv-upload"
                    />
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      disabled={isImporting}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {isImporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4" />
                      )}
                      {isImporting
                        ? "Importing..."
                        : csvFileName || "Choose CSV file"}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="api" className="space-y-4 pt-4">
                <div className="bg-muted/50 rounded-xl p-6 space-y-4 border border-dashed">
                  <div className="p-3 bg-background rounded-lg w-fit border shadow-sm">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-base">
                      Programmatic Access
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Integrate Penna directly into your website or
                      application using our simple REST API.
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button variant="outline" className="w-full gap-2" asChild>
                      <Link href="/docs">
                        <BookOpen className="w-4 h-4" />
                        View API Docs
                      </Link>
                    </Button>
                  </div>
                </div>
                <div className="text-[0.7rem] text-muted-foreground text-center px-4">
                  You can find your API key and Project ID in the project
                  settings tab.
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
            A list of all users subscribed to your project.
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
                      <TableCell>{subscriber.email}</TableCell>
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
                                project.
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
              <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
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

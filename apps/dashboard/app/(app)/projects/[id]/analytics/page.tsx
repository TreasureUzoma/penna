"use client";

import { useParams } from "next/navigation";
import { useProject, useProjectAnalytics } from "@/hooks/use-projects";
import { useEmails } from "@/hooks/use-emails";
import { Loader2, Mail, MailX, MailWarning, Clock } from "lucide-react";
import {
  Card,
  CardContent,
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
import Link from "next/link";
import numeral from "numeral";

/**
 * Deliberately distinct from the Overview tab rather than repeating its
 * KPI cards/growth chart: subscriber health (subscribed/unsubscribed/
 * bounced — real now that the SES bounce/complaint webhook actually
 * suppresses subscribers) and the full send history, not just the single
 * "latest post" Overview already shows.
 */
export default function ProjectAnalyticsPage() {
  const params = useParams();
  const slug = params.id as string;

  const { data: project, isLoading: isProjectLoading } = useProject(slug);
  const { data: analytics, isLoading: isAnalyticsLoading } =
    useProjectAnalytics(project?.id ?? "");
  const { data: emails, isLoading: isEmailsLoading } = useEmails(slug);

  if (isProjectLoading || isAnalyticsLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const breakdown = analytics?.statusBreakdown;
  const statusCards = [
    {
      label: "Subscribed",
      value: breakdown?.subscribed ?? 0,
      icon: Mail,
      color: "text-emerald-500",
    },
    {
      label: "Unsubscribed",
      value: breakdown?.unsubscribed ?? 0,
      icon: MailX,
      color: "text-muted-foreground",
    },
    {
      label: "Bounced",
      value: breakdown?.bounced ?? 0,
      icon: MailWarning,
      color: "text-amber-500",
    },
    {
      label: "Pending",
      value: breakdown?.pending ?? 0,
      icon: Clock,
      color: "text-blue-500",
    },
  ];

  // Same "actually sent" definition used everywhere else (posts list
  // status badges, the edit-lock, account-wide recent activity): status
  // published AND sentAt has actually passed — excludes scheduled posts
  // that haven't gone out yet.
  const sendHistory = (emails ?? [])
    .filter(
      (email) =>
        email.status === "published" &&
        new Date(email.sentAt).getTime() <= Date.now()
    )
    .sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime()
    );

  return (
    <div className="space-y-8 pb-10">
      <p className="text-muted-foreground">
        Subscriber health and send history for this project.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statusCards.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <p className="text-xl font-medium">
                {numeral(stat.value).format("0,0")}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Send History</CardTitle>
        </CardHeader>
        <CardContent>
          {isEmailsLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : sendHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No posts sent yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sendHistory.map((email) => (
                  <TableRow key={email.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/projects/${slug}/posts/${email.id}`}
                        className="hover:underline"
                      >
                        {email.subject}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(email.sentAt).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

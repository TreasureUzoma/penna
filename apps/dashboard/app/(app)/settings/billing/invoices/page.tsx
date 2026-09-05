"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Download, Eye } from "lucide-react";
import { SettingsLayout } from "../../components/settings-layout";
import { format } from "date-fns";
import { useGetInvoices } from "@/hooks/use-invoices";
import { getStatusColor, formatAmount } from "@/lib/invoice-utils";
import { Skeleton } from "@workspace/ui/components/skeleton";
import Link from "next/link";

export default function InvoicesPage(): React.ReactNode {
  const { data: invoices = [], isLoading, error } = useGetInvoices();

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Invoices</h2>
            <p className="text-muted-foreground">
              View and download your billing invoices
            </p>
          </div>

          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-9 w-20" />
                        <Skeleton className="h-9 w-20" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Invoices</h2>
          <p className="text-muted-foreground">
            View and download your billing invoices
          </p>
        </div>

        {error && (
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">
                Failed to load invoices
              </p>
            </CardContent>
          </Card>
        )}

        {invoices.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-10">
                <p className="text-muted-foreground">No invoices yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Your invoices will appear here once you make a purchase
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <Card key={invoice.serial}>
                <CardContent className="pt-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="font-medium">
                        Invoice #{invoice.reference}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(invoice.createdAt), "MMM d, yyyy")}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <p className="font-semibold">
                          {formatAmount(invoice.amount, invoice.currency)}
                        </p>
                        <p
                          className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(
                            invoice.status,
                          )}`}
                        >
                          {invoice.status.charAt(0).toUpperCase() +
                            invoice.status.slice(1)}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">View</span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          disabled
                        >
                          <Download className="w-4 h-4" />
                          <span className="hidden sm:inline">Download</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="bg-muted/50 border-dashed">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              Need help with your invoices?{" "}
              <Button asChild variant="link" className="p-0 h-auto">
                <Link href="/contact">Contact support</Link>
              </Button>
            </p>
          </CardContent>
        </Card>
      </div>
    </SettingsLayout>
  );
}

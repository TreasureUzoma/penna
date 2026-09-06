"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { CopyButton } from "@workspace/ui/components/copy-button";
import { toast } from "sonner";

export const NewsletterIdTab = ({ newsletterId }: { newsletterId: string }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Newsletter ID</CardTitle>
        <CardDescription>
          Your newsletter ID is used to identify your newsletter.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <Input defaultValue={newsletterId} disabled />
          <CopyButton
            content={newsletterId}
            onCopy={() => toast.success("Copied to clipboard")}
          />
        </div>
      </CardContent>
    </Card>
  );
};

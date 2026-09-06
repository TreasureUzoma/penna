import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Users } from "lucide-react";
import Link from "next/link";
import numeral from "numeral";
import type { TopNewsletter } from "@/hooks/use-dashboard";

interface TopNewslettersProps {
  newsletters?: TopNewsletter[];
}

export function TopNewsletters({ newsletters }: TopNewslettersProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Top Newsletters</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {newsletters?.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No newsletters yet.
            </p>
          )}
          {newsletters?.map((newsletter, idx) => (
            <Link
              key={newsletter.id}
              href={`/newsletters/${newsletter.slug}`}
              className="flex items-center gap-3 -mx-2 px-2 py-2 rounded-md hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm font-medium text-muted-foreground w-4 shrink-0">
                {idx + 1}
              </span>
              <span className="flex-1 text-sm font-medium truncate">
                {newsletter.name}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground shrink-0">
                <Users className="w-3.5 h-3.5" />
                {numeral(newsletter.subscriberCount).format("0,0")}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

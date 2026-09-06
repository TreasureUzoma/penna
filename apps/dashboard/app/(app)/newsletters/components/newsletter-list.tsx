"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import Link from "next/link";
import { Newsletter } from "@workspace/constants/types/newsletters";

interface NewsletterListProps {
  newsletters?: Newsletter[];
}

export function NewsletterList({ newsletters }: NewsletterListProps) {
  if (!newsletters || newsletters.length === 0) {
    return (
      <div>
        <h2 className="font-semibold mb-4">Newsletters</h2>
        <div className="text-center py-10 text-muted-foreground">
          No newsletters found.
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-semibold mb-4">Newsletters</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {newsletters.map((newsletter) => (
          <Link href={`/newsletters/${newsletter.slug}`} key={newsletter.id}>
            <Card className="h-full py-4 hover:bg-accent/50 rounded-sm px-4 cursor-pointer transition-colors">
              <CardContent className="space-y-2">
                <CardTitle className="text-base">{newsletter.name}</CardTitle>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {newsletter.description || "No description"}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

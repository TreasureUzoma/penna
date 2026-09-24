import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { HugeiconsIcon } from "@hugeicons/react";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight02Icon, Mail01Icon } from "@hugeicons/core-free-icons";

interface LatestPostProps {
  post?: {
    id: string;
    subject: string;
    sentAt: string;
    openRate: number;
    clickRate: number;
  } | null;
}

export function LatestPost({ post }: LatestPostProps) {
  const params = useParams();
  const slug = params.id as string;

  if (!post) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Latest Post</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-10 text-center">
          <div className="p-3 rounded-full bg-neutral-800 mb-4">
            <HugeiconsIcon
              icon={Mail01Icon}
              className="h-6 w-6 text-neutral-400"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            You haven't sent any posts yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Latest Post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg line-clamp-1">{post.subject}</h3>
          <p className="text-sm text-muted-foreground">
            Sent on {new Date(post.sentAt).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="ghost" className="w-full justify-between" asChild>
          <Link href={`/newsletters/${slug}/posts/${post.id}`}>
            View post
            <HugeiconsIcon icon={ArrowRight02Icon} className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

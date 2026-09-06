import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { CheckCircle2, PenLine, Send, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

interface NewsletterCTAProps {
  newsletter: any;
  stats?: {
    totalSubscribers: number;
    lastPostSent: string | null;
  };
}

export function NewsletterCTA({ newsletter, stats }: NewsletterCTAProps) {
  const params = useParams();
  const slug = params.id as string;

  const lastSent = stats?.lastPostSent ? new Date(stats.lastPostSent) : null;
  const hasNeverSent = !lastSent;
  const isStale =
    !!lastSent &&
    new Date().getTime() - lastSent.getTime() > 14 * 24 * 60 * 60 * 1000;

  // Context-aware CTA — ordered by priority. Falls through to `null`
  // ("everything's fine, nothing to nudge") when the newsletter has
  // subscribers and has posted recently: previously there was no such
  // case, so a healthy, active newsletter fell through to the same "Write
  // your first post" object used for a genuinely brand-new one.
  let cta: {
    title: string;
    description: string;
    buttonText: string;
    icon: typeof PenLine;
    href: string;
  } | null = null;

  if (stats?.totalSubscribers === 0) {
    cta = {
      title: "Share your signup link",
      description:
        "You don't have any subscribers yet. Share your signup page to start growing.",
      buttonText: "Copy Link",
      icon: Share2,
      href: `/newsletters/${slug}/settings`,
    };
  } else if (hasNeverSent) {
    cta = {
      title: "Write your first post",
      description:
        "You're all set up! Share your first newsletter with your subscribers.",
      buttonText: "Create Post",
      icon: PenLine,
      href: `/newsletters/${slug}/posts/new`,
    };
  } else if (isStale) {
    cta = {
      title: "Send your next newsletter",
      description:
        "It's been a while since your last update. Keep your audience engaged.",
      buttonText: "Send Post",
      icon: Send,
      href: `/newsletters/${slug}/posts/new`,
    };
  }

  if (!cta) {
    return (
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 w-fit rounded-lg bg-neutral-200 dark:bg-neutral-800">
              <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">You're all caught up</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Recently active with subscribers on board — nothing needs
                your attention right now.
              </p>
            </div>
          </div>
          <div className="mt-8">
            <Button className="w-full" variant="outline" asChild>
              <Link href={`/newsletters/${slug}/posts`}>View Posts</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 w-fit rounded-lg bg-neutral-200 dark:bg-neutral-800">
            <cta.icon className="h-6 w-6 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">{cta.title}</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              {cta.description}
            </p>
          </div>
        </div>
        <div className="mt-8">
          <Button className="w-full" asChild>
            <Link href={cta.href}>
              {cta.buttonText}
              <cta.icon className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

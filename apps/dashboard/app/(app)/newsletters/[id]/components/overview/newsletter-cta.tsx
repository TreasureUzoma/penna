import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  CheckIcon,
  CheckmarkCircle01Icon,
  PencilEdit01Icon,
  SendIcon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface NewsletterCTAProps {
  newsletter: any;
  stats?: {
    totalSubscribers: number;
    lastPostSent: string | null;
  };
}

const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL || "http://localhost:3000";

export function NewsletterCTA({ newsletter, stats }: NewsletterCTAProps) {
  const params = useParams();
  const slug = params.id as string;
  const [copied, setCopied] = useState(false);

  const lastSent = stats?.lastPostSent ? new Date(stats.lastPostSent) : null;
  const hasNeverSent = !lastSent;
  const isStale =
    !!lastSent &&
    new Date().getTime() - lastSent.getTime() > 14 * 24 * 60 * 60 * 1000;

  const handleCopySignupLink = async () => {
    const publicUrl = `${WEB_URL}/${newsletter.slug || slug}`;

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(publicUrl);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Error copying newsletter signup link", error);
    }
  };

  // Context-aware CTA — ordered by priority. Falls through to `null`
  // ("everything's fine, nothing to nudge") when the newsletter has
  // subscribers and has posted recently: previously there was no such
  // case, so a healthy, active newsletter fell through to the same "Write
  // your first post" object used for a genuinely brand-new one.
  let cta: {
    title: string;
    description: string;
    buttonText: string;
    icon: typeof PencilEdit01Icon;
    href?: string;
    onClick?: () => void;
  } | null = null;

  if (stats?.totalSubscribers === 0) {
    cta = {
      title: "Share your signup link",
      description:
        "You don't have any subscribers yet. Share your signup page to start growing.",
      buttonText: copied ? "Copied!" : "Copy Link",
      icon: Share08Icon,
      onClick: handleCopySignupLink,
    };
  } else if (hasNeverSent) {
    cta = {
      title: "Write your first post",
      description:
        "You're all set up! Share your first newsletter with your subscribers.",
      buttonText: "Create Post",
      icon: PencilEdit01Icon,
      href: `/newsletters/${slug}/posts/new`,
    };
  } else if (isStale) {
    cta = {
      title: "Send your next newsletter",
      description:
        "It's been a while since your last update. Keep your audience engaged.",
      buttonText: "Send Post",
      icon: SendIcon,
      href: `/newsletters/${slug}/posts/new`,
    };
  }

  if (!cta) {
    return (
      <Card>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 w-fit rounded-lg bg-neutral-200 dark:bg-neutral-800">
              <HugeiconsIcon
                icon={CheckmarkCircle01Icon}
                className="h-6 w-6 text-emerald-400"
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold">You're all caught up</h3>
              <p className="text-neutral-400 text-sm leading-relaxed">
                Recently active with subscribers on board — nothing needs your
                attention right now.
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

  const buttonContent = (
    <>
      {cta.buttonText}
      {copied ? (
        <HugeiconsIcon icon={CheckIcon} className="ml-2 h-4 w-4" />
      ) : (
        <HugeiconsIcon icon={cta.icon} className="ml-2 h-4 w-4" />
      )}
    </>
  );

  return (
    <Card>
      <CardContent>
        <div className="space-y-4">
          <div className="p-3 w-fit rounded-lg bg-neutral-200 dark:bg-neutral-800">
            <HugeiconsIcon
              icon={cta.icon}
              className="h-6 w-6 text-emerald-400"
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">{cta.title}</h3>
            <p className="text-neutral-400 text-sm leading-relaxed">
              {cta.description}
            </p>
          </div>
        </div>
        <div className="mt-8">
          {cta.href ? (
            <Button className="w-full" asChild>
              <Link href={cta.href}>{buttonContent}</Link>
            </Button>
          ) : (
            <Button className="w-full" type="button" onClick={cta.onClick}>
              {buttonContent}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

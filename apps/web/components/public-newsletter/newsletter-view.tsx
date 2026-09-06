import Link from "next/link";
import type { PublicPost, PublicNewsletter } from "@/lib/public-newsletters";
import { SubscribeForm } from "./subscribe-form";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Renders a newsletter's public page at penna.dev/{slug}. */
export function NewsletterView({
  newsletter,
  posts,
}: {
  newsletter: PublicNewsletter;
  posts: PublicPost[];
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-5 pt-16 md:pt-24 pb-20">
      <div className="space-y-3 mb-10">
        <h1 className="text-3xl md:text-4xl font-bold">{newsletter.name}</h1>
        {newsletter.description && (
          <p className="text-muted-foreground leading-relaxed">
            {newsletter.description}
          </p>
        )}
      </div>

      <div className="mb-12">
        <SubscribeForm slug={newsletter.slug} />
      </div>

      {posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No posts published yet.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {posts.map((post) => (
            <li key={post.id} className="py-6 first:pt-0">
              <Link
                href={`/${newsletter.slug}/${post.id}`}
                className="block group space-y-2"
              >
                <p className="text-xs text-muted-foreground">
                  {formatDate(post.sentAt)}
                </p>
                <h2 className="text-lg font-semibold group-hover:underline underline-offset-4">
                  {post.subject}
                </h2>
                {post.excerpt && (
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground text-center mt-16">
        Powered by{" "}
        <Link href="/" className="underline hover:text-foreground">
          Penna
        </Link>
      </p>
    </div>
  );
}

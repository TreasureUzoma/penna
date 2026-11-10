import Link from "next/link";
import type { PublicPost, PublicNewsletter } from "@/lib/public-newsletters";
import { SubscribeForm } from "./subscribe-form";
import styles from "./post-content.module.css";

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
    <main className="max-w-2xl mx-auto px-4 md:px-5 pt-14 md:pt-20 pb-20">
      <header className="text-center">
        {newsletter.avatarUrl ? (
          <img
            src={newsletter.avatarUrl}
            alt=""
            className="mx-auto mb-6 h-20 w-20 rounded-md border border-border object-cover"
          />
        ) : (
          <div
            aria-hidden="true"
            className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-md border border-border bg-primary/5 text-2xl font-semibold text-primary"
          >
            {newsletter.name.trim().charAt(0).toUpperCase()}
          </div>
        )}
        <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
          {newsletter.name}
        </h1>
        {newsletter.descriptionHtml ? (
          <div
            className={`${styles.content} mx-auto mt-5 max-w-xl text-muted-foreground`}
            // This HTML is rendered and sanitized by the server Markdown renderer.
            dangerouslySetInnerHTML={{ __html: newsletter.descriptionHtml }}
          />
        ) : newsletter.description ? (
          <p className="mx-auto mt-5 max-w-xl whitespace-pre-wrap leading-relaxed text-muted-foreground">
            {newsletter.description}
          </p>
        ) : null}
      </header>

      <div className="mx-auto mt-9 max-w-xl py-6">
        <SubscribeForm slug={newsletter.slug} />
      </div>

      {posts.length > 0 && (
        <section id="recent-posts" className="mt-14 scroll-mt-8">
          <h2 className="mb-3 text-lg font-semibold">Recent posts</h2>
          <ul className="divide-y divide-border">
            {posts.map((post) => (
              <li key={post.id} className="py-5 first:pt-3">
                <Link
                  href={`/${newsletter.slug}/${post.id}`}
                  className="group block space-y-2"
                >
                  <p className="text-xs text-muted-foreground">
                    {formatDate(post.sentAt)}
                  </p>
                  <h3 className="text-lg font-semibold group-hover:underline underline-offset-4">
                    {post.subject}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                      {post.excerpt}
                    </p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="text-xs text-muted-foreground text-center mt-16">
        Published with{" "}
        <Link href="/" className="underline hover:text-foreground">
          Penna
        </Link>
      </p>
    </main>
  );
}

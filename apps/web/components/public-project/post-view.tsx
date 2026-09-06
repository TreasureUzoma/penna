import Link from "next/link";
import type { PublicPostDetail, PublicProject } from "@/lib/public-projects";
import styles from "./post-content.module.css";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Renders a single published post — shared by the /u/[username]/[slug]/[postId] and /[slug]/[postId] routes. */
export function PostView({
  project,
  post,
  basePath,
}: {
  project: PublicProject;
  post: PublicPostDetail;
  basePath: string;
}) {
  return (
    <article className="max-w-2xl mx-auto px-4 md:px-5 pt-16 md:pt-24 pb-20">
      <Link
        href={basePath}
        className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-4"
      >
        ← {project.name}
      </Link>

      <div className="mt-6 mb-10 space-y-2">
        <p className="text-xs text-muted-foreground">
          {formatDate(post.sentAt)}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">
          {post.subject}
        </h1>
      </div>

      <div
        className={styles.content}
        // Rendered server-side from Markdown and sanitized against an
        // allowlist before this ever reaches the client — see
        // renderNewsletterMarkdown in apps/server/lib/markdown.ts, the
        // same renderer used for the emailed version of this post.
        dangerouslySetInnerHTML={{ __html: post.html }}
      />

      <p className="text-xs text-muted-foreground text-center mt-16">
        Powered by{" "}
        <Link href="/" className="underline hover:text-foreground">
          Penna
        </Link>
      </p>
    </article>
  );
}

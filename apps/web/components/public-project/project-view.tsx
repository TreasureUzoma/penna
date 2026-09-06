import Link from "next/link";
import type { PublicPost, PublicProject } from "@/lib/public-projects";
import { SubscribeForm } from "./subscribe-form";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Renders a project's public page — shared by app/u/[username]/[slug] and
 * the clean app/[slug] route, which is the same content at a different
 * URL. `basePath` is whichever of those the caller resolved to, so post
 * links land on the URL the visitor is actually using.
 */
export function ProjectView({
  project,
  posts,
  basePath,
}: {
  project: PublicProject;
  posts: PublicPost[];
  basePath: string;
}) {
  return (
    <div className="max-w-2xl mx-auto px-4 md:px-5 pt-16 md:pt-24 pb-20">
      <div className="space-y-3 mb-10">
        <h1 className="text-3xl md:text-4xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="text-muted-foreground leading-relaxed">
            {project.description}
          </p>
        )}
      </div>

      <div className="mb-12">
        <SubscribeForm slug={project.slug} />
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
                href={`${basePath}/${post.id}`}
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

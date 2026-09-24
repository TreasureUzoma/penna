import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPublicNewsletter,
  getPublicPost,
  getPublicPosts,
} from "@/lib/public-newsletters";
import { PostView } from "@/components/public-newsletter/post-view";

interface Props {
  params: Promise<{ slug: string; postId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postId } = await params;
  const [newsletter, post] = await Promise.all([
    getPublicNewsletter(slug),
    getPublicPost(slug, postId),
  ]);
  if (!newsletter || !post) return {};

  const title = `${post.subject} - ${newsletter.name}`;
  // Derive a description from the excerpt available on the list endpoint.
  // getPublicPost returns rendered HTML, so we fall back to the subject.
  const posts = await getPublicPosts(slug);
  const listEntry = posts?.find((p) => p.id === postId);
  const description = listEntry?.excerpt
    ? listEntry.excerpt.slice(0, 160)
    : `Read "${post.subject}" from ${newsletter.name} on Penna.`;
  const url = `https://penna.dev/${slug}/${postId}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "article",
      publishedTime: post.sentAt,
      images: [
        {
          url: `/${slug}/${postId}/opengraph-image`,
          width: 1200,
          height: 630,
          alt: post.subject,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
  };
}

/** A single published post — penna.dev/{slug}/{postId}. */
export default async function PublicPostPage({ params }: Props) {
  const { slug, postId } = await params;
  const newsletter = await getPublicNewsletter(slug);
  if (!newsletter) notFound();

  const post = await getPublicPost(slug, postId);
  if (!post) notFound();

  return <PostView newsletter={newsletter} post={post} />;
}

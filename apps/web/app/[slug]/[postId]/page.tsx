import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicNewsletter, getPublicPost } from "@/lib/public-newsletters";
import { PostView } from "@/components/public-newsletter/post-view";

interface Props {
  params: Promise<{ slug: string; postId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postId } = await params;
  const newsletter = await getPublicNewsletter(slug);
  if (!newsletter) return {};
  const post = await getPublicPost(slug, postId);
  if (!post) return {};

  return { title: `${post.subject} - ${newsletter.name}` };
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

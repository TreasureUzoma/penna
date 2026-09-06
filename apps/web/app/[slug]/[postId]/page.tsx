import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProject, getPublicPost } from "@/lib/public-projects";
import { PostView } from "@/components/public-project/post-view";

interface Props {
  params: Promise<{ slug: string; postId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, postId } = await params;
  const project = await getPublicProject(slug);
  if (!project) return {};
  const post = await getPublicPost(slug, postId);
  if (!post) return {};

  return { title: `${post.subject} - ${project.name}` };
}

/** Clean-URL counterpart to app/u/[username]/[slug]/[postId] — see that route and app/[slug]/page.tsx for the gating rationale. */
export default async function PublicPostCleanPage({ params }: Props) {
  const { slug, postId } = await params;
  const project = await getPublicProject(slug);
  if (!project) notFound();

  if (!project.hasCleanUrl) {
    redirect(`/u/${project.ownerUsername}/${slug}/${postId}`);
  }

  const post = await getPublicPost(slug, postId);
  if (!post) notFound();

  return <PostView project={project} post={post} basePath={`/${slug}`} />;
}

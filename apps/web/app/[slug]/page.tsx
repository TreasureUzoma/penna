import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProject, getPublicPosts } from "@/lib/public-projects";
import { ProjectView } from "@/components/public-project/project-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) return {};

  return {
    title: `${project.name} - penna`,
    description: project.description ?? undefined,
  };
}

/**
 * The clean, no-username project URL — a Pro+ perk (see `hasCleanUrl` in
 * services/projects.ts's `getPublicProjectBySlug`). A free-plan owner's
 * project still exists, but only answers at /u/{username}/{slug}; hitting
 * it here redirects there instead of rendering, so the clean path can't be
 * used to route around the gate.
 */
export default async function PublicProjectCleanPage({ params }: Props) {
  const { slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) notFound();

  if (!project.hasCleanUrl) {
    redirect(`/u/${project.ownerUsername}/${slug}`);
  }

  const posts = (await getPublicPosts(slug)) ?? [];

  return <ProjectView project={project} posts={posts} basePath={`/${slug}`} />;
}

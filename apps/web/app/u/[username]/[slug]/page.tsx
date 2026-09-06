import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProject, getPublicPosts } from "@/lib/public-projects";
import { ProjectView } from "@/components/public-project/project-view";

interface Props {
  params: Promise<{ username: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) return {};

  return {
    title: `${project.name} - penna`,
    description: project.description ?? undefined,
    alternates: {
      // Pro+ owners get promoted to the clean /{slug} URL for SEO — this
      // link still works either way, but it's not the canonical one for them.
      canonical: project.hasCleanUrl ? `/${project.slug}` : undefined,
    },
  };
}

export default async function PublicProjectByUsernamePage({ params }: Props) {
  const { username, slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) notFound();

  // A stale or hand-typed username shouldn't quietly serve someone else's
  // project under it — send visitors to the real one instead of 404ing.
  if (project.ownerUsername !== username) {
    redirect(`/u/${project.ownerUsername}/${slug}`);
  }

  const posts = (await getPublicPosts(slug)) ?? [];

  return (
    <ProjectView
      project={project}
      posts={posts}
      basePath={`/u/${username}/${slug}`}
    />
  );
}

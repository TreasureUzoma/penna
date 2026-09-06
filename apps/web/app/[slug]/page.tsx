import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicNewsletter, getPublicPosts } from "@/lib/public-newsletters";
import { NewsletterView } from "@/components/public-newsletter/newsletter-view";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const newsletter = await getPublicNewsletter(slug);
  if (!newsletter) return {};

  return {
    title: `${newsletter.name} - penna`,
    description: newsletter.description ?? undefined,
  };
}

/** A newsletter's public page — penna.dev/{slug}, for every plan (slugs have always been globally unique, so there's no per-user namespacing to gate). */
export default async function PublicNewsletterPage({ params }: Props) {
  const { slug } = await params;
  const newsletter = await getPublicNewsletter(slug);
  if (!newsletter) notFound();

  const posts = (await getPublicPosts(slug)) ?? [];

  return <NewsletterView newsletter={newsletter} posts={posts} />;
}

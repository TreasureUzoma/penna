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

  const title = `${newsletter.name} - penna`;
  const description = newsletter.description ?? `Read ${newsletter.name} on Penna.`;
  const url = `https://penna.dev/${slug}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      images: [
        {
          url: `/og?slug=${encodeURIComponent(slug)}`,
          width: 1200,
          height: 630,
          alt: `${newsletter.name} newsletter`,
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

/** A newsletter's public page — penna.dev/{slug}, for every plan (slugs have always been globally unique, so there's no per-user namespacing to gate). */
export default async function PublicNewsletterPage({ params }: Props) {
  const { slug } = await params;
  const newsletter = await getPublicNewsletter(slug);
  if (!newsletter) notFound();

  const posts = (await getPublicPosts(slug)) ?? [];

  return <NewsletterView newsletter={newsletter} posts={posts} />;
}

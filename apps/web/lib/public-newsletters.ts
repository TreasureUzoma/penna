// Server-side data fetching for the public newsletter page
// (app/[slug]) against the API's unauthenticated /public/newsletters/*
// endpoints — see apps/server/routes/api/v1/public/newsletters.ts.
//
// These run inside React Server Components, not the browser, so they hit
// API_URL directly rather than going through next.config.mjs's `/api/:path+`
// rewrite (that rewrite only applies to requests that actually reach this
// app's own HTTP server).
const API_BASE = process.env.API_URL || "http://localhost:3005";

export interface PublicNewsletter {
  id: string;
  slug: string;
  name: string;
  description: string | null;
}

export interface PublicPost {
  id: string;
  subject: string;
  sentAt: string;
  excerpt: string;
}

export interface PublicPostDetail {
  id: string;
  subject: string;
  sentAt: string;
  html: string;
}

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      // Public pages don't need to be second-by-second fresh — a short
      // revalidate window keeps this from hitting the API on every request
      // while still picking up a new post within a minute.
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export const getPublicNewsletter = (slug: string) =>
  getJson<PublicNewsletter>(
    `/api/v1/public/newsletters/${encodeURIComponent(slug)}`
  );

export const getPublicPosts = (slug: string, page = 1) =>
  getJson<PublicPost[]>(
    `/api/v1/public/newsletters/${encodeURIComponent(slug)}/posts?page=${page}`
  );

export const getPublicPost = (slug: string, postId: string) =>
  getJson<PublicPostDetail>(
    `/api/v1/public/newsletters/${encodeURIComponent(slug)}/posts/${encodeURIComponent(postId)}`
  );

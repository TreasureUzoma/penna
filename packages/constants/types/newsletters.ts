export type Newsletter = {
  id: string;
  slug: string;
  name: string;
  description: string;
  isPublicAt: string | null;
  config?: {
    avatarUrl?: string | null;
    removeBranding?: boolean;
    emailTracking?: boolean;
    welcomeEmail?: {
      enabled?: boolean;
      subject?: string;
      body?: string;
    };
  } | null;
};

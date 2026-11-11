import { Suspense } from "react";
import { OAuthConsent } from "./oauth-consent";

export default function OAuthAuthorizePage() {
  return <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-20 text-center text-muted-foreground">Loading authorization…</div>}><OAuthConsent /></Suspense>;
}

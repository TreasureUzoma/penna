"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Loader2 } from "lucide-react";
import { useGetProfile } from "@/hooks/use-auth";
import { useAcceptTeamInvite } from "@/hooks/use-teams";

/**
 * Standalone, same reasoning as ForgotPasswordForm/ResetPasswordForm/
 * VerifyEmailForm — plain markup rather than routed through AuthForm.
 * This is the first real accept-invite page the app has had (the old
 * per-newsletter invite email just linked to the dashboard root and hoped
 * you'd find it — see the comment that used to be on
 * sendNewsletterInviteEmail).
 */
export function AcceptInviteForm({ token }: { token?: string }) {
  const router = useRouter();
  const { data: profile, isLoading: isLoadingProfile } = useGetProfile();
  const { mutate: acceptInvite, isPending, isSuccess, isError, error } =
    useAcceptTeamInvite();
  const [hasAttempted, setHasAttempted] = useState(false);

  const isLoggedIn = !isLoadingProfile && !!profile;

  useEffect(() => {
    if (isLoggedIn && token && !hasAttempted) {
      setHasAttempted(true);
      acceptInvite(token);
    }
  }, [isLoggedIn, token, hasAttempted, acceptInvite]);

  const currentUrl =
    typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="flex flex-col gap-6 w-full max-w-md md:max-w-xl">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Team invitation</CardTitle>
          <CardDescription>
            {!token
              ? "This invite link is missing its token."
              : !isLoggedIn
                ? "Sign in or create an account to accept it."
                : isSuccess
                  ? "You're in!"
                  : isPending
                    ? "Accepting your invitation..."
                    : "Something went wrong."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token && (
            <p className="text-sm text-center text-muted-foreground">
              Double-check the link from your invite email, or ask whoever
              invited you to send a new one.
            </p>
          )}

          {token && !isLoadingProfile && !isLoggedIn && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                Once you're signed in, come back to this same link to accept
                the invite.
              </p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link href={`/signup?next=${encodeURIComponent(currentUrl)}`}>
                    Create account
                  </Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href={`/login?next=${encodeURIComponent(currentUrl)}`}>
                    Sign in
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {token && isLoggedIn && isPending && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {token && isLoggedIn && isSuccess && (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">
                You've joined the team — its newsletters now show up in your
                dashboard.
              </p>
              <Button className="w-full" onClick={() => router.push("/newsletters")}>
                Go to dashboard
              </Button>
            </div>
          )}

          {token && isLoggedIn && isError && (
            <p className="text-sm text-center text-destructive">
              {(error as any)?.message || "Failed to accept this invitation."}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

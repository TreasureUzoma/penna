import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";

/**
 * Standalone, same reasoning as ForgotPasswordForm/ResetPasswordForm —
 * pulled out of the shared AuthForm rather than debugged inside it.
 */
export function VerifyEmailForm() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-md md:max-w-xl">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Verify your email</CardTitle>
          <CardDescription>
            We&apos;ve sent a verification link to your email. Please check
            your inbox.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="text-center">
            <Button variant="link" className="h-auto p-0 font-medium">
              Resend link
            </Button>
          </div>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Wrong account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

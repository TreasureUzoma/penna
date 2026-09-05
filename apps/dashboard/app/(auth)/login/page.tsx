import { Metadata } from "next";
import { AuthForm } from "../components/auth-form";
import { OauthParamErros } from "@workspace/types";
import { Alert, AlertTitle } from "@workspace/ui/components/alert";
import { AlertCircleIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Login - Penna",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: OauthParamErros | undefined }>;
}) {
  const OAUTH_ERROR_MESSAGES: Record<OauthParamErros, string> = {
    missing_code: "Something went wrong signing you in. Please try again.",
    auth_failed: "Something went wrong signing you in. Please try again.",
    signups_closed: "Signups are currently closed — check back after launch.",
  };
  const error = (await searchParams).error;
  return (
    <div className="flex min-h-screen md:min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 flex-center">
        {error && OAUTH_ERROR_MESSAGES[error] && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>{OAUTH_ERROR_MESSAGES[error]}</AlertTitle>
          </Alert>
        )}
        <AuthForm mode="login" />
      </div>
    </div>
  );
}

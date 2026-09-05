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
  const VALID_OAUTH_ERRORS: OauthParamErros[] = ["missing_code", "auth_failed"];
  const error = (await searchParams).error;
  return (
    <div className="flex min-h-screen md:min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 flex-center">
        {error && VALID_OAUTH_ERRORS.includes(error) && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Error occured {error}.</AlertTitle>
          </Alert>
        )}
        <AuthForm mode="login" />
      </div>
    </div>
  );
}

import { Metadata } from "next";
import { AuthForm } from "../components/auth-form";
import { Alert, AlertTitle } from "@workspace/ui/components/alert";
import { AlertCircleIcon } from "lucide-react";

export const metadata: Metadata = {
  title: "Reset Password - Penna",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const token = (await searchParams).token;
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 flex-center">
        {!token && (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Invalid token</AlertTitle>
          </Alert>
        )}
        <AuthForm mode="reset-password" token={token} />
      </div>
    </div>
  );
}

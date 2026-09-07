import { Metadata } from "next";
import { ResetPasswordForm } from "../components/reset-password-form";

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
        <ResetPasswordForm token={token} />
      </div>
    </div>
  );
}

import { Metadata } from "next";
import { VerifyEmailForm } from "../components/verify-email-form";

export const metadata: Metadata = {
  title: "Verify your Email - Penna",
};

// No token handling here — this page is just the "check your inbox"
// landing screen shown right after signup; it doesn't consume a token
// itself (that used to gate an "Invalid token" alert that fired on every
// visit with no token, which is every visit, since this page never
// receives one).
export default function VerifyEmailPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 flex-center">
        <VerifyEmailForm />
      </div>
    </div>
  );
}

import { Metadata } from "next";
import { ForgotPasswordForm } from "../components/forgot-password-form";

export const metadata: Metadata = {
  title: "Forgot Password - Penna",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen md:min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 flex-center">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}

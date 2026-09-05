import { Metadata } from "next";
import { AuthForm } from "../components/auth-form";

export const metadata: Metadata = {
  title: "Forgot Password - Penna",
};

export default function ForgotPasswordPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 flex-center">
        <AuthForm mode="forgot-password" />
      </div>
    </div>
  );
}

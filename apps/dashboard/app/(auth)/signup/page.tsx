import { Metadata } from "next";
import { AuthForm } from "../components/auth-form";

export const metadata: Metadata = {
  title: "Signup - Penna",
};

export default function SignupPage() {
  return (
    <div className="min-h-screen md:min-h-svh flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full flex-col gap-6 flex-center">
        <AuthForm mode="signup" />
      </div>
    </div>
  );
}

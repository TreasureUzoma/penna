"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { ErrorParagraph } from "@workspace/ui/components/error-message";
import { Spinner } from "@workspace/ui/components/spinner";
import { verifyResetPasswordSchema } from "@workspace/validations";
import { useResetPassowrd } from "@/hooks/use-auth";
import { Eye, EyeOff } from "lucide-react";

/**
 * Standalone, same reasoning as ForgotPasswordForm — pulled out of the
 * shared AuthForm rather than debugged inside it, since that component's
 * Field/FieldGroup layering collapsed sparse-content modes down to a
 * sliver-thin card.
 */
export function ResetPasswordForm({ token }: { token?: string }) {
  const { mutate: resetPassMutate, isPending } = useResetPassowrd();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<{ password: string; confirmPassword: string }>({
    mode: "onBlur",
  });

  const handlePasswordBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const result = verifyResetPasswordSchema.shape.password.safeParse(
      e.target.value,
    );
    if (!result.success) {
      setError("password", {
        type: "manual",
        message: result.error.issues[0]?.message,
      });
    } else {
      clearErrors("password");
    }
  };

  const onSubmit = (data: { password: string; confirmPassword: string }) => {
    if (data.password !== data.confirmPassword) {
      setError("confirmPassword", {
        type: "manual",
        message: "Passwords must match",
      });
      return;
    }

    const result = verifyResetPasswordSchema.safeParse({
      password: data.password,
      token,
    });
    if (!result.success) {
      const passwordIssue = result.error.issues.find(
        (i) => i.path[0] === "password",
      );
      if (passwordIssue) {
        setError("password", { type: "manual", message: passwordIssue.message });
      }
      if (result.error.issues.some((i) => i.path[0] === "token")) {
        setError("confirmPassword", {
          type: "manual",
          message: "This reset link is invalid or has expired.",
        });
      }
      return;
    }

    resetPassMutate(result.data);
  };

  if (!token) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-md md:max-w-xl">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Reset your password</CardTitle>
            <CardDescription>
              This password reset link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-center text-muted-foreground">
              <Link
                href="/forgot-password"
                className="underline underline-offset-4"
              >
                Request a new one
              </Link>{" "}
              or{" "}
              <Link href="/login" className="underline underline-offset-4">
                back to login
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-md md:max-w-xl">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-6"
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  {...register("password")}
                  onBlur={handlePasswordBlur}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <ErrorParagraph>{errors.password.message}</ErrorParagraph>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  {...register("confirmPassword")}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={
                    showConfirmPassword ? "Hide password" : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <ErrorParagraph>{errors.confirmPassword.message}</ErrorParagraph>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? <Spinner /> : "Update password"}
            </Button>
          </form>

          <p className="text-sm text-center text-muted-foreground mt-6">
            Remembered your password?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Back to login
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

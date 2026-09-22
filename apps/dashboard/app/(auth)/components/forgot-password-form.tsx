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

import { isValidEmail } from "@workspace/validations";

import { useForgotPassword } from "@/hooks/use-auth";
import { TurnstileWidget } from "@/components/turnstile-widget";

export function ForgotPasswordForm() {
  const { mutate: forgotMutate, isPending } = useForgotPassword();
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    formState: { errors },
  } = useForm<{
    email: string;
    turnstileToken?: string;
  }>({
    mode: "onBlur",
  });

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const result = isValidEmail.safeParse({ email: e.target.value });

    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "email");

      if (issue) {
        setError("email", {
          type: "manual",
          message: issue.message,
        });
      }
    } else {
      clearErrors("email");
    }
  };

  const onSubmit = (data: { email: string; turnstileToken?: string }) => {
    const result = isValidEmail.safeParse(data);

    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === "email");

      if (issue) {
        setError("email", {
          type: "manual",
          message: issue.message,
        });
      }

      return;
    }

    if (!data.turnstileToken) {
      setError("turnstileToken", {
        type: "manual",
        message: "Turnstile token is required",
      });

      return;
    }

    forgotMutate(
      {
        email: data.email,
        turnstileToken: data.turnstileToken,
      },
      {
        onSuccess: () => setSubmitted(true),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md md:max-w-xl">
      <Card className="w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Forgot your password?</CardTitle>

          <CardDescription>
            {submitted
              ? "Check your inbox for the reset link."
              : "Enter your email and we'll send you a password reset link."}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <p className="text-sm text-muted-foreground text-center">
              If an account exists for that email, a reset link is on its way.
            </p>
          ) : (
            <form
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">Email</Label>

                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                  onBlur={handleBlur}
                  required
                />

                {errors.email && (
                  <ErrorParagraph>{errors.email.message}</ErrorParagraph>
                )}
              </div>

              <div>
                <TurnstileWidget
                  onVerify={(token) => {
                    setValue("turnstileToken", token);
                  }}
                />

                {errors.turnstileToken && (
                  <ErrorParagraph>
                    {errors.turnstileToken.message}
                  </ErrorParagraph>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? <Spinner /> : "Send reset link"}
              </Button>
            </form>
          )}

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

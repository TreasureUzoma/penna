"use client";

import React from "react";
import { cn } from "@workspace/ui/lib/utils";
import Link from "next/link";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@workspace/ui/components/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@workspace/ui/components/field";
import { Input } from "@workspace/ui/components/input";
import { Button } from "@workspace/ui/components/button";
import { GithubLogo, GoogleLogo } from "@workspace/ui/components/icons";
import { useForm } from "react-hook-form";
import {
  loginSchema,
  createAccountSchema,
  isValidEmail,
  verifyResetPasswordSchema,
} from "@workspace/validations";
import {
  useForgotPassword,
  useLoginMutation,
  useOauthSigninMutation,
  useResetPassowrd,
  useSignupMutation,
} from "@/hooks/use-auth";
import { getAuthButtonLabel } from "../utils/labels";
import { ErrorParagraph } from "@workspace/ui/components/error-message";
import { Spinner } from "@workspace/ui/components/spinner";
import { descriptions, titles } from "../utils/data";
import { Eye, EyeOff } from "lucide-react";

export interface AuthProps {
  mode:
    | "login"
    | "signup"
    | "forgot-password"
    | "verify-email"
    | "reset-password";
  token?: string;
  className?: string;
}

export function AuthForm({ mode, className, token }: AuthProps) {
  const { mutate: loginMutate, isPending: loginPending } = useLoginMutation();
  const { mutate: signupMutate, isPending: signupPending } =
    useSignupMutation();
  const { mutate: ouathMutate, isPending: oauthPending } =
    useOauthSigninMutation();
  const { mutate: forgotMutate, isPending: forgotPending } =
    useForgotPassword();
  const { mutate: resetPassMutate, isPending: resetPassPending } =
    useResetPassowrd();

  const [loadingProvider, setLoadingProvider] = React.useState<
    "github" | "google" | null
  >(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const isPending =
    loginPending || signupPending || forgotPending || resetPassPending;

  const isLogin = mode === "login";
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot-password";
  const isVerify = mode === "verify-email";
  const isReset = mode === "reset-password";

  // fallback type for all possible inputs
  type BaseFormValues = {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  };

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<BaseFormValues>({
    mode: "onBlur",
  });

  const schema = isSignup
    ? createAccountSchema
    : isLogin
      ? loginSchema
      : isForgot
        ? isValidEmail
        : null;

  const handleBlur = async (
    e: React.FocusEvent<HTMLInputElement>,
    fieldName: keyof BaseFormValues,
  ) => {
    if (!schema) return;
    const value = e.target.value;
    const currentData = { [fieldName]: value };

    const result = schema.safeParse(currentData);
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === fieldName);
      if (issue) {
        setError(fieldName, { type: "manual", message: issue.message });
      }
    } else {
      clearErrors(fieldName);
    }
  };

  const onSubmit = (data: BaseFormValues) => {
    if (schema) {
      const result = schema.safeParse(data);
      if (!result.success) {
        result.error.issues.forEach((issue) => {
          setError(issue.path[0] as keyof BaseFormValues, {
            type: "manual",
            message: issue.message,
          });
        });
        return; // stop submission
      }
    }

    if (mode === "login") {
      const payload = {
        email: data.email!,
        password: data.password!,
      };
      loginMutate(payload);
    } else if (mode === "signup") {
      const payload = {
        name: data.name!,
        email: data.email!,
        password: data.password!,
      };
      signupMutate(payload);
    } else if (mode === "forgot-password") {
      forgotMutate(data.email!);
    } else if (mode === "reset-password") {
      const payload = {
        token: token!,
        password: data.password!,
      };
      if (data.password !== data.confirmPassword) {
        setError("confirmPassword", {
          type: "manual",
          message: "Passwords must mtch",
        });
        return;
      }
      resetPassMutate(payload);
    } else if (mode === "verify-email") {
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <Card className="w-full max-w-md md:max-w-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">{titles[mode]}</CardTitle>
          <CardDescription>{descriptions[mode]}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <FieldGroup>
              {(isLogin || isSignup) && (
                <>
                  <Field>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={loadingProvider !== null}
                      onClick={() => {
                        setLoadingProvider("github");
                        ouathMutate("github");
                      }}
                    >
                      <GithubLogo />
                      {loadingProvider === "github" ? (
                        <Spinner />
                      ) : (
                        "Continue with Github"
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      disabled={loadingProvider !== null}
                      onClick={() => {
                        setLoadingProvider("google");
                        ouathMutate("google");
                      }}
                    >
                      <GoogleLogo />
                      {loadingProvider === "google" ? (
                        <Spinner />
                      ) : (
                        "Continue with Google"
                      )}
                    </Button>
                  </Field>

                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                    Or continue with
                  </FieldSeparator>
                </>
              )}

              {(isLogin || isSignup || isForgot || isReset) && (
                <>
                  {isSignup && (
                    <Field>
                      <FieldLabel htmlFor="name">Full Name</FieldLabel>
                      <Input
                        id="name"
                        type="text"
                        placeholder="Full Name"
                        {...register("name")}
                        onBlur={(e) => handleBlur(e, "name")}
                        required
                      />
                      {errors.name && (
                        <ErrorParagraph>{errors.name.message}</ErrorParagraph>
                      )}
                    </Field>
                  )}

                  {mode !== "reset-password" && (
                    <Field>
                      <FieldLabel htmlFor="email">Email</FieldLabel>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        {...register("email")}
                        onBlur={(e) => handleBlur(e, "email")}
                        required
                      />
                      {errors.email && (
                        <ErrorParagraph>{errors.email.message}</ErrorParagraph>
                      )}
                    </Field>
                  )}

                  {(isLogin || isSignup || isReset) && (
                    <Field>
                      <div className="flex items-center">
                        <FieldLabel htmlFor="password">
                          {mode === "reset-password" && "New "}Password
                        </FieldLabel>
                        {isLogin && (
                          <Link
                            href="/forgot-password"
                            className="font-medium ml-auto text-sm underline-offset-4 hover:underline"
                          >
                            Forgot your password?
                          </Link>
                        )}
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          {...register("password")}
                          onBlur={(e) => handleBlur(e, "password")}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      {errors.password && (
                        <ErrorParagraph>
                          {errors.password.message}
                        </ErrorParagraph>
                      )}
                    </Field>
                  )}

                  {isReset && (
                    <Field>
                      <FieldLabel htmlFor="confirm-password">
                        Confirm password
                      </FieldLabel>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          {...register("confirmPassword")}
                          onBlur={(e) => handleBlur(e, "confirmPassword")}
                          required
                          className="pr-10"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
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
                        <ErrorParagraph>
                          {errors.confirmPassword.message}
                        </ErrorParagraph>
                      )}
                    </Field>
                  )}
                </>
              )}

              {isVerify && (
                <FieldDescription className="text-center">
                  We’ve sent you an email with a verification link.
                  <br />
                  <Button
                    variant="link"
                    className="mt-2 h-auto p-0 font-medium"
                  >
                    Resend link
                  </Button>
                </FieldDescription>
              )}

              {!isVerify && (
                <Field>
                  <Button type="submit" className="w-full" disabled={isPending}>
                    {getAuthButtonLabel({ mode, isPending })}
                  </Button>

                  {(isLogin || isSignup) && (
                    <FieldDescription className="text-center">
                      {isLogin ? (
                        <>
                          Don&apos;t have an account?{" "}
                          <Link href="/signup">Sign up</Link>
                        </>
                      ) : (
                        <>
                          Already have an account?{" "}
                          <Link href="/login">Sign in</Link>
                        </>
                      )}
                    </FieldDescription>
                  )}
                </Field>
              )}
            </FieldGroup>
          </form>
        </CardContent>
      </Card>

      {(isLogin || isSignup) && (
        <FieldDescription className="px-6 text-center">
          By clicking continue, you agree to our{" "}
          <Link href="/terms">Terms of Service</Link> and{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </FieldDescription>
      )}
    </div>
  );
}

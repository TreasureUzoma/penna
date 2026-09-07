import { AuthProps } from "../components/auth-form";

interface GetAuthButtonLabelOptions {
  mode: AuthProps["mode"];
  isPending?: boolean;
}

export function getAuthButtonLabel({
  mode,
  isPending,
}: GetAuthButtonLabelOptions): string {
  const baseLabels: Record<GetAuthButtonLabelOptions["mode"], string> = {
    login: "Login",
    signup: "Sign up",
  };

  const pendingLabels: Record<GetAuthButtonLabelOptions["mode"], string> = {
    login: "Logging in...",
    signup: "Creating account...",
  };

  return isPending ? pendingLabels[mode] : baseLabels[mode];
}

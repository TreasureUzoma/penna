import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@workspace/axios";
import type {
  Login,
  Signup,
  VerifyResetPassword,
} from "@workspace/validations";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { OauthType } from "@workspace/types/auth";
import { UserProfile } from "@workspace/types/res/user";

// `next` only ever comes from this app's own URLs (e.g. proxy.ts's
// `?next=` on a protected-route bounce, or the accept-invite page's
// "sign in" link) — restricted to same-origin relative paths so a
// crafted `?next=https://evil.example` can't turn this into an open
// redirect after a real login.
const safeNextPath = (next?: string): string | null => {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
};

export const useLoginMutation = (next?: string) => {
  const queryClint = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (body: Login & { website?: string }) =>
      api.post("/auth/login", body),
    onSuccess: () => {
      queryClint.invalidateQueries({ queryKey: ["session"] });
      toast.success("Logged in successfully");
      router.push(safeNextPath(next) ?? "/dashboard");
    },
    onError: (err) => {
      toast.error(err?.message ?? "Failed to login");
    },
  });
};

export const useSignupMutation = () => {
  const queryClint = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (body: Signup & { website?: string }) =>
      api.post("/auth/signup", body),
    onSuccess: () => {
      queryClint.invalidateQueries({ queryKey: ["session"] });
      toast.success("Verify your email address");
      router.push("/verify-email");
    },
    onError: (err) => {
      toast.error(err?.message ?? "Failed to create account");
    },
  });
};

export const useOauthSigninMutation = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (method: OauthType) => api(`/auth/${method}/url`),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      router.push(res.data.url);
    },
    onError: (err) => {
      toast.error(err?.message ?? "Something went wrong");
    },
  });
};

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: async (email: string) =>
      api.post("/auth/forgotten-password", { email }),
    onSuccess: (res) => {
      toast.success(res.data.message ?? "Password reset link sent — check your email");
    },
    onError: (err) => {
      toast.error(err?.message ?? "Failed to send password reset link");
    },
  });
};

export const useResetPassowrd = () => {
  const router = useRouter();
  return useMutation({
    mutationFn: (body: VerifyResetPassword) =>
      api.post("/auth/reset-password", body),
    onSuccess: () => {
      toast.success("Password reset successfully");
      router.push("/login");
    },
    onError: (err) => {
      toast.error(err?.message ?? "Failed to reset password.");
    },
  });
};

export const useGetProfile = () => {
  return useQuery<UserProfile>({
    queryKey: ["session"],
    queryFn: async () => {
      const { data: res } = await api(`/profile`);
      return res.data;
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => api.patch("/profile", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
      toast.success("Profile updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Failed to update profile");
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (email: string) =>
      api.delete("/profile", { data: { email } }),
    onSuccess: () => {
      queryClient.clear();
      toast.success("Account deleted. Goodbye 👋");
      router.push("/login");
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Failed to delete account. Please try again."
      );
    },
  });
};

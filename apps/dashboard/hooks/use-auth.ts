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

export const useLoginMutation = () => {
  const queryClint = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (body: Login) => api.post("/auth/login", body),
    onSuccess: () => {
      queryClint.invalidateQueries({ queryKey: ["session"] });
      toast.success("Logged in successfully");
      router.push("/dashboard");
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
    mutationFn: (body: Signup) => api.post("/auth/signup", body),
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

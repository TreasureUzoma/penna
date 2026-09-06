import { z } from "zod";

const USERNAME_REGEX = /^[a-z0-9_-]+$/;

export const BANNED_USERNAMES = [
  "about",
  "account",
  "activity",
  "admin",
  "api",
  "app",
  "auth",
  "billing",
  "billings",
  "blog",
  "contact",
  "dashboard",
  "developer",
  "developers",
  "docs",
  "domains",
  "email",
  "emails",
  "external",
  "forgot-password",
  "help",
  "legal",
  "penna",
  "login",
  "logout",
  "new",
  "onboarding",
  "payments",
  "post",
  "posts",
  "pricing",
  "privacy",
  "profile",
  "projects",
  "register",
  "reset-password",
  "root",
  "route",
  "safety",
  "security",
  "settings",
  "signup",
  "status",
  "support",
  "terms",
  "u",
  "user",
  "username",
  "users",
  "verify-email",
  "www",
];

const BANNED_SET = new Set(
  BANNED_USERNAMES.map((name) => name.toLowerCase().trim())
);

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z
    .string()
    .trim()
    .min(7, "Password must be at least 7 characters")
    .max(50, "Password must be less than 50 characters"),
});

export type Login = z.infer<typeof loginSchema>;

export const createAccountSchema = z.object({
  email: z.string().email(),
  password: z
    .string()
    .trim()
    .min(7, "Password must be at least 7 characters")
    .max(50, "Password must be less than 50 characters"),
  name: z
    .string()
    .min(2, "Fullname must be at least 2 characters")
    .max(30, "Fullname is too long"),
});

export type Signup = z.infer<typeof createAccountSchema>;

export const verifyResetPasswordSchema = z.object({
  password: z
    .string()
    .trim()
    .min(7, "Password must be at least 7 characters")
    .max(50, "Password must be less than 50 characters"),
  token: z.string().uuid("Invalid Token"),
});

export type VerifyResetPassword = z.infer<typeof verifyResetPasswordSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string()
      .trim()
      .min(7, "Password must be at least 7 characters")
      .max(50, "Password must be less than 50 characters"),

    newPassword: z
      .string()
      .trim()
      .min(7, "Password must be at least 7 characters")
      .max(50, "Password must be less than 50 characters"),

    confirmPassword: z
      .string()
      .trim()
      .min(7, "Password must be at least 7 characters")
      .max(50, "Password must be less than 50 characters"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type ChangePasswordData = z.infer<typeof changePasswordSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().uuid("Invalid Token"),
});

export type VerifyEmail = z.infer<typeof verifyEmailSchema>;

export const createProjectSchema = z.object({
  name: z.string().min(1).max(35),
  slug: z
    .string()
    .min(3, { message: "Slug must be at least 3 characters long." })
    .max(30, { message: "Slug must be 30 characters or less." })
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, {
      message:
        "Slug must only contain lowercase letters, numbers, and hyphens (-).",
    })
    .refine(
      (value) => !BANNED_SET.has(value),
      (value) => ({
        message: `The slug '${value}' is reserved and cannot be used.`,
      })
    ),
  description: z.string().max(255).optional(),
  isPublic: z.boolean(),
});

export type NewProject = z.infer<typeof createProjectSchema>;

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(35).optional(),
  slug: z
    .string()
    .min(3, { message: "Slug must be at least 3 characters long." })
    .max(30, { message: "Slug must be 30 characters or less." })
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, {
      message:
        "Slug must only contain lowercase letters, numbers, and hyphens (-).",
    })
    .refine(
      (value) => !BANNED_SET.has(value),
      (value) => ({
        message: `The slug '${value}' is reserved and cannot be used.`,
      })
    )
    .optional(),
  description: z.string().max(255).optional(),
  isPublic: z.boolean().optional(),
  removeBranding: z.boolean().optional(),
});

export type UpdateProject = z.infer<typeof updateProjectSchema>;

export const transferProjectOwnershipSchema = z.object({
  newOwnerUserId: z.string().uuid("Invalid user ID"),
});

export type TransferProjectOwnership = z.infer<
  typeof transferProjectOwnershipSchema
>;

export const importSubscribersSchema = z.object({
  csvContent: z.string().min(1, "CSV content is required"),
});

export type ImportSubscribers = z.infer<typeof importSubscribersSchema>;

export const isValidUUID = z.object({
  id: z.string().uuid("Invalid UUID format"),
});

export const isValidEmail = z.object({
  email: z.string().email("Invalid email format"),
});

export const isValidUsername = z.object({
  username: z
    .string()
    .min(3, { message: "Username must be at least 3 characters long." })
    .max(20, { message: "Username must be 20 characters or less." })
    .trim()
    .toLowerCase()
    .regex(USERNAME_REGEX, {
      message:
        "Username must only contain lowercase letters, numbers, hyphens (-), or underscores (_).",
    })
    .refine(
      (value) => !BANNED_SET.has(value),
      (value) => ({
        message: `The username '${value}' is reserved and cannot be used.`,
      })
    ),
});

export const isValidToken = z.object({
  token: z.string().min(60).max(900),
});

export const newProjectInviteSchema = z.object({
  projectId: z.string().min(1),
  invitedByUserId: z.string().uuid(),
  invitedToUserId: z.string().uuid(),
});

export const updateProjectMemberRoleSchema = z.object({
  projectId: z.string().min(1),
  targetUserId: z.string().uuid(),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

export type NewProjectInvite = z.infer<typeof newProjectInviteSchema>;

export const acceptProjectInviteSchema = z.object({
  inviteId: z.string().uuid(),
  acceptingUserId: z.string().uuid(),
});

export const inviteUserToProjectSchema = z.object({
  projectId: z.string().min(1),
  invitedByUserId: z.string().uuid(),
  invitedToUserId: z.string().uuid(),
  role: z.enum(["owner", "admin", "editor", "viewer"]),
});

export const unsubscribeFromProjectSchema = z.object({
  projectId: z.string().min(1),
  email: z.string().email(),
});

export type UnsubscribeRequest = z.infer<typeof unsubscribeFromProjectSchema>;

export const createProjectSubscriberSchema = z.object({
  name: z.string().min(2).max(40).optional().or(z.literal("")),
  email: z.string().email(),
  projectId: z.string().min(1),
});

export type CreateSubscriber = z.infer<typeof createProjectSubscriberSchema>;

export const createSegmentSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  description: z.string().max(200).optional().or(z.literal("")),
});

export type CreateSegment = z.infer<typeof createSegmentSchema>;

export const updateProfileSchema = z
  .object({
    name: z
      .string({
        invalid_type_error: "Name must be a string.",
      })
      .min(1, { message: "Name cannot be empty." })
      .max(50, { message: "Name must be 50 characters or less." })
      .optional(),

    username: z
      .string({
        invalid_type_error: "Username must be a string.",
      })
      .min(3, { message: "Username must be at least 3 characters long." })
      .max(20, { message: "Username must be 20 characters or less." })
      .trim()
      .toLowerCase()
      .regex(USERNAME_REGEX, {
        message:
          "Username must only contain lowercase letters, numbers, hyphens (-), or underscores (_).",
      })
      .refine(
        (value) => !BANNED_SET.has(value),
        (value) => ({
          message: `The username '${value}' is reserved and cannot be used.`,
        })
      )
      .optional(),

    avatarUrl: z
      .string({
        invalid_type_error: "Avatar URL must be a string.",
      })
      .url({ message: "Invalid URL format for avatar." })
      .nullish(),
  })
  .partial();

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

export const insertPostSchema = z.object({
  subject: z.string().min(4).max(30),
  body: z.string().min(2).max(6000),
  status: z.enum(["published", "draft"]),
  projectId: z.string().min(1),
  sentAt: z.coerce.date().optional(),
});

export type InsertPost = z.infer<typeof insertPostSchema>;

export const dashboardOverviewSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  sort: z
    .enum(["name", "activity", "newest", "oldest", "revenue", "subscribers"])
    .optional(),
  search: z.string().optional(),
});

export type DashboardOverview = z.infer<typeof dashboardOverviewSchema>;

export const addDomainSchema = z.object({
  // Bare hostname only — no protocol/path. Lowercased and trimmed so
  // "Blog.John.dev" and "blog.john.dev " both land on the same row (the
  // `domains.name` column has a unique index).
  name: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, { message: "Enter a domain, e.g. news.yoursite.com" })
    .max(255)
    .regex(/^(?!:\/\/)([a-z0-9-]+\.)+[a-z]{2,}$/, {
      message: "Enter a valid domain, e.g. news.yoursite.com",
    }),
  // Optional — omit to verify the domain first and assign it to a project
  // later (see the account-wide Domains page + `assignDomainSchema` below).
  projectId: z.string().uuid().optional(),
});

export type AddDomain = z.infer<typeof addDomainSchema>;

export const assignDomainSchema = z.object({
  projectId: z.string().uuid("Pick a project"),
});

export type AssignDomain = z.infer<typeof assignDomainSchema>;

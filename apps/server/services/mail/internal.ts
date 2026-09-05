import type { ProjectRoles } from "@workspace/types";
import { sendSystemEmail } from "./ses";
import { meta } from "@workspace/constants/meta";
import { envConfig } from "@/config";

// throw errors on error

export const sendWelcomeEmail = async (name: string, email: string) => {
  const html = `
    <p>hi ${name},</p>
    <p>welcome to ${meta.name} — glad to have you.</p>
    <p><a href="${envConfig.DASHBOARD_SITE}/dashboard">head to your dashboard</a> to create your first project.</p>
    <p>— ${meta.name}</p>
  `;

  const result = await sendSystemEmail({
    to: email,
    subject: `Welcome to ${meta.name}`,
    html,
  });

  if (!result.success) {
    console.error("Failed to send welcome email:", result.error);
  }
  return result;
};

export const sendForgottenPasswordEmail = async (
  email: string,
  expiresAt: Date,
  token: string
) => {
  const resetUrl = `${envConfig.DASHBOARD_SITE}/reset-password?token=${token}`;
  const expiresInMinutes = Math.round(
    (expiresAt.getTime() - Date.now()) / (60 * 1000)
  );

  const html = `
    <p>hi,</p>
    <p>we got a request to reset your ${meta.name} password. this link expires in ${expiresInMinutes} minutes:</p>
    <p><a href="${resetUrl}">reset your password</a></p>
    <p>if you didn't request this, you can safely ignore this email.</p>
    <p>— ${meta.name}</p>
  `;

  const result = await sendSystemEmail({
    to: email,
    subject: `Reset your ${meta.name} password`,
    html,
  });

  if (!result.success) {
    console.error("Failed to send forgotten-password email:", result.error);
  }
  return result;
};

export const sendProjectInviteEmail = async (
  email: string,
  inviterName: string,
  projectName: string,
  role: ProjectRoles
) => {
  // No accept-invite page exists in the dashboard yet — this links to the
  // dashboard root and relies on the invitee signing in to see/accept it
  // via `POST /projects/roles/accept`. Update this once that UI ships.
  const dashboardUrl = `${envConfig.DASHBOARD_SITE}/dashboard`;

  const html = `
    <p>hi,</p>
    <p><strong>${inviterName}</strong> invited you to join <strong>${projectName}</strong> on ${meta.name} as a <strong>${role}</strong>.</p>
    <p><a href="${dashboardUrl}">sign in to accept the invite</a></p>
    <p>— ${meta.name}</p>
  `;

  const result = await sendSystemEmail({
    to: email,
    subject: `You've been invited to ${projectName} on ${meta.name}`,
    html,
  });

  if (!result.success) {
    console.error("Failed to send project invite email:", result.error);
  }
  return result;
};

export const sendUnsubscribeCofirmationEmail = async (
  email: string,
  projectName: string,
  confirmUrl: string
) => {
  const html = `
    <p>hi,</p>
    <p>we got a request to unsubscribe <strong>${email}</strong> from <strong>${projectName}</strong>'s newsletter. confirm below:</p>
    <p><a href="${confirmUrl}">confirm unsubscribe</a></p>
    <p>if you didn't request this, you can safely ignore this email — you'll stay subscribed.</p>
    <p>— ${meta.name}</p>
  `;

  const result = await sendSystemEmail({
    to: email,
    subject: `Confirm unsubscribe from ${projectName}`,
    html,
  });

  if (!result.success) {
    console.error(
      "Failed to send unsubscribe confirmation email:",
      result.error
    );
  }
  return result;
};

export interface SubscriberLimitWarningOptions {
  ownerEmail: string;
  ownerName: string;
  projectName: string;
  planName: string;
  subscriberCount: number;
  subscriberCap: number;
  upgradeUrl: string;
  /** "approaching" = crossed 80%, still able to add subscribers.
   *  "reached" = at/over the cap — new subscribers are being blocked. */
  status: "approaching" | "reached";
}

/**
 * Warns a project owner they're near or over their plan's subscriber cap.
 * Called from `services/limits.ts` whenever usage crosses a threshold —
 * see that file for the dedupe logic that keeps this from firing on every
 * single subscriber added.
 */
export const sendSubscriberLimitWarningEmail = async (
  options: SubscriberLimitWarningOptions
) => {
  const {
    ownerEmail,
    ownerName,
    projectName,
    planName,
    subscriberCount,
    subscriberCap,
    upgradeUrl,
    status,
  } = options;

  const subject =
    status === "reached"
      ? `${projectName} has hit its subscriber limit`
      : `${projectName} is approaching its subscriber limit`;

  const bodyLine =
    status === "reached"
      ? `<strong>${projectName}</strong> has reached ${subscriberCount.toLocaleString()} subscribers — the limit included in your <strong>${planName}</strong> plan (${subscriberCap.toLocaleString()}). New subscribers can't be added until you upgrade.`
      : `<strong>${projectName}</strong> is at ${subscriberCount.toLocaleString()} of the ${subscriberCap.toLocaleString()} subscribers included in your <strong>${planName}</strong> plan.`;

  const html = `
    <p>hi ${ownerName},</p>
    <p>${bodyLine}</p>
    <p><a href="${upgradeUrl}">upgrade your plan</a> to keep growing without interruption.</p>
    <p>— ${meta.name}</p>
  `;

  const result = await sendSystemEmail({ to: ownerEmail, subject, html });
  if (!result.success) {
    console.error(
      "Failed to send subscriber limit warning email:",
      result.error
    );
  }
  return result;
};

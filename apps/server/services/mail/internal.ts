import type { NewsletterRoles } from "@workspace/types";
import { sendSystemEmail } from "./ses";
import { meta } from "@workspace/constants/meta";
import { envConfig } from "@/config";

// throw errors on error

export const sendWelcomeEmail = async (name: string, email: string) => {
  const html = `
    <p>hi ${name},</p>
    <p>welcome to ${meta.name} — glad to have you.</p>
    <p><a href="${envConfig.DASHBOARD_SITE}/dashboard">head to your dashboard</a> to create your first newsletter.</p>
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

export const sendNewsletterInviteEmail = async (
  email: string,
  inviterName: string,
  newsletterName: string,
  role: NewsletterRoles
) => {
  // No accept-invite page exists in the dashboard yet — this links to the
  // dashboard root and relies on the invitee signing in to see/accept it
  // via `POST /newsletters/roles/accept`. Update this once that UI ships.
  const dashboardUrl = `${envConfig.DASHBOARD_SITE}/dashboard`;

  const html = `
    <p>hi,</p>
    <p><strong>${inviterName}</strong> invited you to join <strong>${newsletterName}</strong> on ${meta.name} as a <strong>${role}</strong>.</p>
    <p><a href="${dashboardUrl}">sign in to accept the invite</a></p>
    <p>— ${meta.name}</p>
  `;

  const result = await sendSystemEmail({
    to: email,
    subject: `You've been invited to ${newsletterName} on ${meta.name}`,
    html,
  });

  if (!result.success) {
    console.error("Failed to send newsletter invite email:", result.error);
  }
  return result;
};

export const sendUnsubscribeCofirmationEmail = async (
  email: string,
  newsletterName: string,
  confirmUrl: string
) => {
  const html = `
    <p>hi,</p>
    <p>we got a request to unsubscribe <strong>${email}</strong> from <strong>${newsletterName}</strong>'s newsletter. confirm below:</p>
    <p><a href="${confirmUrl}">confirm unsubscribe</a></p>
    <p>if you didn't request this, you can safely ignore this email — you'll stay subscribed.</p>
    <p>— ${meta.name}</p>
  `;

  const result = await sendSystemEmail({
    to: email,
    subject: `Confirm unsubscribe from ${newsletterName}`,
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
  newsletterName: string;
  planName: string;
  subscriberCount: number;
  subscriberCap: number;
  upgradeUrl: string;
  /** "approaching" = crossed 80%, still able to add subscribers.
   *  "reached" = at/over the cap — new subscribers are being blocked. */
  status: "approaching" | "reached";
}

/**
 * Warns a newsletter owner they're near or over their plan's subscriber cap.
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
    newsletterName,
    planName,
    subscriberCount,
    subscriberCap,
    upgradeUrl,
    status,
  } = options;

  const subject =
    status === "reached"
      ? `${newsletterName} has hit its subscriber limit`
      : `${newsletterName} is approaching its subscriber limit`;

  const bodyLine =
    status === "reached"
      ? `<strong>${newsletterName}</strong> has reached ${subscriberCount.toLocaleString()} subscribers — the limit included in your <strong>${planName}</strong> plan (${subscriberCap.toLocaleString()}). New subscribers can't be added until you upgrade.`
      : `<strong>${newsletterName}</strong> is at ${subscriberCount.toLocaleString()} of the ${subscriberCap.toLocaleString()} subscribers included in your <strong>${planName}</strong> plan.`;

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

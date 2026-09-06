import { db } from "@workspace/db";
import { domains, newsletterMembers, newsletters } from "@workspace/db/schema";
import type { ServiceResponse } from "@workspace/types";
import { and, desc, eq, isNull, or } from "drizzle-orm";
import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
} from "@aws-sdk/client-sesv2";
import { envConfig } from "@/config";
import {
  canUseCustomDomain,
  getUserNewsletterRole,
  isUserOnPaidPlan,
} from "./newsletters";

const sesv2 = new SESv2Client({
  region: envConfig.AWS_REGION,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  },
});

const MANAGE_ROLES = ["owner", "admin"] as const;

/** A CNAME record a customer needs to add at their DNS provider. */
export interface DnsCnameRecord {
  name: string;
  value: string;
}

/**
 * What we persist for Easy DKIM (see `CreateEmailIdentityCommand` — no
 * `DkimSigningAttributes` means SES issues 3 tokens rather than us
 * bringing our own key pair). The `domains.dkimKey` column is a single
 * text field, so this is JSON-encoded into it rather than getting its own
 * columns — there's no fixed number of tokens to reserve columns for, and
 * nothing else reads this shape.
 */
interface DkimData {
  tokens: string[];
  hostedZone: string;
}

const serializeDkim = (data: DkimData): string => JSON.stringify(data);

const parseDkim = (raw: string | null): DkimData | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.tokens)) return parsed as DkimData;
    return null;
  } catch {
    return null;
  }
};

/** Builds the CNAME records a customer adds to prove domain ownership via Easy DKIM. */
const dkimCnameRecords = (
  domainName: string,
  dkim: DkimData | null
): DnsCnameRecord[] =>
  (dkim?.tokens ?? []).map((token) => ({
    name: `${token}._domainkey.${domainName}`,
    value: `${token}.${dkim!.hostedZone || "dkim.amazonses.com"}`,
  }));

/** Shapes a `domains` row for the dashboard: DB fields plus the DNS records to show. */
const toDomainView = (row: typeof domains.$inferSelect) => ({
  id: row.id,
  newsletterId: row.newsletterId,
  name: row.name,
  verified: row.verified,
  createdAt: row.createdAt,
  dnsRecords: dkimCnameRecords(row.name, parseDkim(row.dkimKey)),
});

export type DomainView = ReturnType<typeof toDomainView>;

/**
 * Every domain visible to a user: ones attached to a newsletter they belong
 * to, plus ones they've verified themselves but haven't assigned to a
 * newsletter yet. Backs both the account-wide Domains page (unfiltered) and
 * a single newsletter's Domains tab (`newsletterId` filter) — same query either
 * way, just narrowed.
 */
export const listUserDomains = async (
  userId: string,
  newsletterId?: string
): Promise<ServiceResponse> => {
  try {
    const rows = await db
      .select({ domain: domains, newsletter: newsletters })
      .from(domains)
      .leftJoin(newsletters, eq(domains.newsletterId, newsletters.id))
      .leftJoin(
        newsletterMembers,
        and(
          eq(newsletterMembers.newsletterId, domains.newsletterId),
          eq(newsletterMembers.userId, userId)
        )
      )
      .where(
        and(
          or(
            eq(newsletterMembers.userId, userId),
            and(isNull(domains.newsletterId), eq(domains.createdByUserId, userId))
          ),
          newsletterId ? eq(domains.newsletterId, newsletterId) : undefined
        )
      )
      .orderBy(desc(domains.createdAt));

    return {
      success: true,
      message: "Fetched domains successfully",
      data: rows.map((row) => ({
        ...toDomainView(row.domain),
        newsletter: row.newsletter
          ? { id: row.newsletter.id, slug: row.newsletter.slug, name: row.newsletter.name }
          : null,
      })),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to fetch domains",
      data: null,
    };
  }
};

/**
 * Registers a sending domain with SES (Easy DKIM) and stores the CNAME
 * records to show the owner. The domain starts unverified — SES detects
 * the DNS records asynchronously, so `refreshDomainVerification` (polled
 * from the dashboard's "Recheck" button) is what flips it to verified.
 *
 * `newsletterId` is optional: pass it to add a domain straight into a newsletter
 * (requires the caller to manage that newsletter — checked here since these
 * routes aren't nested under `/newsletters/:id`), or omit it to verify a
 * domain first and attach it to a newsletter later via `assignDomainToNewsletter`
 * — the account-wide Domains page's flow.
 */
export const addDomain = async (
  userId: string,
  name: string,
  newsletterId?: string
): Promise<ServiceResponse> => {
  try {
    if (newsletterId) {
      const roleRes = await getUserNewsletterRole(newsletterId, userId);
      const role = roleRes.data?.role;
      if (!role || !MANAGE_ROLES.includes(role as any)) {
        return {
          success: false,
          message: "You don't have enough permissions on that newsletter.",
          data: null,
        };
      }

      const allowed = await canUseCustomDomain(newsletterId);
      if (!allowed) {
        return {
          success: false,
          message:
            "Custom domains are a Pro feature. Upgrade the newsletter owner's plan to enable it.",
          data: null,
        };
      }
    } else {
      const allowed = await isUserOnPaidPlan(userId);
      if (!allowed) {
        return {
          success: false,
          message: "Custom domains are a Pro feature. Upgrade your plan to enable it.",
          data: null,
        };
      }
    }

    const [existing] = await db
      .select({ id: domains.id })
      .from(domains)
      .where(eq(domains.name, name));
    if (existing) {
      return {
        success: false,
        message: "This domain is already registered.",
        data: null,
      };
    }

    let identity;
    try {
      identity = await sesv2.send(
        new CreateEmailIdentityCommand({ EmailIdentity: name })
      );
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error
            ? `Failed to register domain with the mail provider: ${err.message}`
            : "Failed to register domain with the mail provider.",
        data: null,
      };
    }

    const dkim: DkimData = {
      tokens: identity.DkimAttributes?.Tokens ?? [],
      hostedZone: identity.DkimAttributes?.SigningHostedZone ?? "dkim.amazonses.com",
    };

    const [row] = await db
      .insert(domains)
      .values({
        newsletterId: newsletterId ?? null,
        createdByUserId: userId,
        name,
        verified: identity.VerifiedForSendingStatus ?? false,
        dkimKey: serializeDkim(dkim),
        type: "email",
      })
      .returning();

    return {
      success: true,
      message:
        "Domain added. Add the DNS records below, then click Recheck once they've propagated.",
      data: toDomainView(row!),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to add domain",
      data: null,
    };
  }
};

/**
 * Whether `userId` may verify/remove `domainId` — ownership on an
 * unassigned domain, or owner/admin membership once it's attached to a
 * newsletter. Shared by `refreshDomainVerification` and `removeDomain` since
 * both routes sit at `/domains/:id`, outside any `/newsletters/:id` nesting
 * that would otherwise carry this check.
 */
const authorizeDomainAccess = async (
  userId: string,
  domainId: string
): Promise<
  | { ok: true; domain: typeof domains.$inferSelect }
  | { ok: false; message: string }
> => {
  const [row] = await db.select().from(domains).where(eq(domains.id, domainId));
  if (!row) return { ok: false, message: "Domain not found" };

  if (row.newsletterId) {
    const roleRes = await getUserNewsletterRole(row.newsletterId, userId);
    const role = roleRes.data?.role;
    if (!role || !MANAGE_ROLES.includes(role as any)) {
      return { ok: false, message: "You don't have enough permissions" };
    }
  } else if (row.createdByUserId !== userId) {
    return { ok: false, message: "You don't have enough permissions" };
  }

  return { ok: true, domain: row };
};

/** Re-checks a domain's DKIM/verification status against SES and persists any change. */
export const refreshDomainVerification = async (
  userId: string,
  domainId: string
): Promise<ServiceResponse> => {
  try {
    const authz = await authorizeDomainAccess(userId, domainId);
    if (!authz.ok) return { success: false, message: authz.message, data: null };
    const { domain: row } = authz;

    let identity;
    try {
      identity = await sesv2.send(
        new GetEmailIdentityCommand({ EmailIdentity: row.name })
      );
    } catch (err) {
      return {
        success: false,
        message:
          err instanceof Error
            ? `Failed to check domain status: ${err.message}`
            : "Failed to check domain status.",
        data: null,
      };
    }

    const verified = identity.VerifiedForSendingStatus ?? false;
    // SES can rotate the DKIM tokens (e.g. if signing was reconfigured) —
    // keep the stored records in sync so the DNS instructions shown to the
    // owner never drift from what SES is actually checking for.
    const dkim: DkimData = {
      tokens:
        identity.DkimAttributes?.Tokens ?? parseDkim(row.dkimKey)?.tokens ?? [],
      hostedZone:
        identity.DkimAttributes?.SigningHostedZone ??
        parseDkim(row.dkimKey)?.hostedZone ??
        "dkim.amazonses.com",
    };

    const [updated] = await db
      .update(domains)
      .set({ verified, dkimKey: serializeDkim(dkim), updatedAt: new Date() })
      .where(eq(domains.id, domainId))
      .returning();

    return {
      success: true,
      message: verified
        ? "Domain verified!"
        : "Still pending — DNS changes can take up to 72 hours to propagate.",
      data: toDomainView(updated!),
    };
  } catch (err) {
    return {
      success: false,
      message:
        err instanceof Error ? err.message : "Failed to check domain status",
      data: null,
    };
  }
};

export const removeDomain = async (
  userId: string,
  domainId: string
): Promise<ServiceResponse> => {
  try {
    const authz = await authorizeDomainAccess(userId, domainId);
    if (!authz.ok) return { success: false, message: authz.message, data: null };
    const { domain: row } = authz;

    try {
      await sesv2.send(
        new DeleteEmailIdentityCommand({ EmailIdentity: row.name })
      );
    } catch (err) {
      // Best-effort — if SES already dropped it (or never finished
      // creating it) we still want the DB row gone.
      console.warn(
        `Failed to delete SES identity for domain ${row.name}:`,
        err instanceof Error ? err.message : err
      );
    }

    await db.delete(domains).where(eq(domains.id, domainId));

    return { success: true, message: "Domain removed", data: null };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to remove domain",
      data: null,
    };
  }
};

/**
 * Attaches an already-verified, unassigned domain to a newsletter — the
 * "verify now, add to a newsletter later" flow from the account-wide Domains
 * page. Only the person who verified it can assign it, and only onto a
 * newsletter they manage whose owner is on a paid plan (same gate as adding
 * a domain directly from that newsletter).
 */
export const assignDomainToNewsletter = async (
  userId: string,
  domainId: string,
  newsletterId: string
): Promise<ServiceResponse> => {
  try {
    const [row] = await db.select().from(domains).where(eq(domains.id, domainId));
    if (!row) {
      return { success: false, message: "Domain not found", data: null };
    }

    if (row.newsletterId) {
      return {
        success: false,
        message:
          "This domain is already assigned to a newsletter. Remove it there first to move it.",
        data: null,
      };
    }

    if (row.createdByUserId !== userId) {
      return {
        success: false,
        message: "You don't have enough permissions",
        data: null,
      };
    }

    const roleRes = await getUserNewsletterRole(newsletterId, userId);
    const role = roleRes.data?.role;
    if (!role || !MANAGE_ROLES.includes(role as any)) {
      return {
        success: false,
        message: "You don't have enough permissions on that newsletter.",
        data: null,
      };
    }

    const allowed = await canUseCustomDomain(newsletterId);
    if (!allowed) {
      return {
        success: false,
        message:
          "Custom domains are a Pro feature. Upgrade the newsletter owner's plan to enable it.",
        data: null,
      };
    }

    const [updated] = await db
      .update(domains)
      .set({ newsletterId, updatedAt: new Date() })
      .where(eq(domains.id, domainId))
      .returning();

    return {
      success: true,
      message: "Domain assigned to newsletter",
      data: toDomainView(updated!),
    };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to assign domain",
      data: null,
    };
  }
};

/**
 * The verified sending domain for a newsletter, if it has one — what
 * `sendNewsletterEmail` (services/mail/ses.ts) uses instead of the shared
 * `NEWSLETTER_DOMAIN` for its `FromEmailAddress`. Returns `null` when the
 * newsletter has no domain of type "email"/"both" that SES has verified,
 * which callers treat as "use the default domain".
 */
export const getVerifiedSendingDomain = async (
  newsletterId: string
): Promise<string | null> => {
  const [row] = await db
    .select({ name: domains.name })
    .from(domains)
    .where(
      and(
        eq(domains.newsletterId, newsletterId),
        eq(domains.verified, true),
        eq(domains.type, "email")
      )
    );

  return row?.name ?? null;
};

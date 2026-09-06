import { db } from "@workspace/db";
import { domains, projectMembers, projects } from "@workspace/db/schema";
import type { ServiceResponse } from "@workspace/types";
import { and, desc, eq } from "drizzle-orm";
import {
  SESv2Client,
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  DeleteEmailIdentityCommand,
} from "@aws-sdk/client-sesv2";
import { envConfig } from "@/config";
import { canUseCustomDomain } from "./projects";

const sesv2 = new SESv2Client({
  region: envConfig.AWS_REGION,
  credentials: {
    accessKeyId: envConfig.AWS_ACCESS_KEY_ID,
    secretAccessKey: envConfig.AWS_SECRET_ACCESS_KEY,
  },
});

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
  projectId: row.projectId,
  name: row.name,
  verified: row.verified,
  createdAt: row.createdAt,
  dnsRecords: dkimCnameRecords(row.name, parseDkim(row.dkimKey)),
});

export type DomainView = ReturnType<typeof toDomainView>;

export const listProjectDomains = async (
  projectId: string
): Promise<ServiceResponse> => {
  try {
    const rows = await db
      .select()
      .from(domains)
      .where(eq(domains.projectId, projectId));

    return {
      success: true,
      message: "Fetched domains successfully",
      data: rows.map(toDomainView),
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
 * Every domain across every project the user belongs to, each tagged with
 * its project's name/slug — backs the account-wide Domains page (root
 * sidebar), as opposed to `listProjectDomains` which backs the per-project
 * one. Same underlying rows, just not scoped to a single project.
 */
export const listUserDomains = async (
  userId: string
): Promise<ServiceResponse> => {
  try {
    const rows = await db
      .select({
        domain: domains,
        projectId: projects.id,
        projectSlug: projects.slug,
        projectName: projects.name,
      })
      .from(domains)
      .innerJoin(projects, eq(domains.projectId, projects.id))
      .innerJoin(projectMembers, eq(projectMembers.projectId, projects.id))
      .where(eq(projectMembers.userId, userId))
      .orderBy(desc(domains.createdAt));

    return {
      success: true,
      message: "Fetched domains successfully",
      data: rows.map((row) => ({
        ...toDomainView(row.domain),
        project: { id: row.projectId, slug: row.projectSlug, name: row.projectName },
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
 * records the owner needs to add. The domain starts unverified — SES
 * detects the DNS records asynchronously, so `refreshDomainVerification`
 * (polled from the dashboard's "Recheck" button) is what flips it to
 * verified.
 */
export const addProjectDomain = async (
  projectId: string,
  name: string
): Promise<ServiceResponse> => {
  try {
    const allowed = await canUseCustomDomain(projectId);
    if (!allowed) {
      return {
        success: false,
        message:
          "Custom domains are a Pro feature. Upgrade the project owner's plan to enable it.",
        data: null,
      };
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
        projectId,
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

/** Re-checks a domain's DKIM/verification status against SES and persists any change. */
export const refreshDomainVerification = async (
  projectId: string,
  domainId: string
): Promise<ServiceResponse> => {
  try {
    const [row] = await db
      .select()
      .from(domains)
      .where(and(eq(domains.id, domainId), eq(domains.projectId, projectId)));

    if (!row) {
      return { success: false, message: "Domain not found", data: null };
    }

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

export const removeProjectDomain = async (
  projectId: string,
  domainId: string
): Promise<ServiceResponse> => {
  try {
    const [row] = await db
      .select()
      .from(domains)
      .where(and(eq(domains.id, domainId), eq(domains.projectId, projectId)));

    if (!row) {
      return { success: false, message: "Domain not found", data: null };
    }

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
 * The verified sending domain for a project, if it has one — what
 * `sendNewsletterEmail` (services/mail/ses.ts) uses instead of the shared
 * `NEWSLETTER_DOMAIN` for its `FromEmailAddress`. Returns `null` when the
 * project has no domain of type "email"/"both" that SES has verified,
 * which callers treat as "use the default domain".
 */
export const getVerifiedSendingDomain = async (
  projectId: string
): Promise<string | null> => {
  const [row] = await db
    .select({ name: domains.name })
    .from(domains)
    .where(
      and(
        eq(domains.projectId, projectId),
        eq(domains.verified, true),
        eq(domains.type, "email")
      )
    );

  return row?.name ?? null;
};

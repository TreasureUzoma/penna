import { envConfig } from "@/config";
import { decryptDataSubtle } from "@/lib/encrypt";
import { db } from "@workspace/db";
import { newsletterApiKeys } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import type { MiddlewareHandler } from "hono";

export const newsletterApiKey: MiddlewareHandler = async (c, next) => {
  const publicKey = c.req.header("x-penna-public-key");
  const privateKey = c.req.header("x-penna-private-key");

  if (!publicKey) {
    return c.json(
      {
        success: false,
        message: `Unauthorized: Missing x-penna-public-key header. See ${envConfig.APP_URL}/docs/auth for setup instructions.`,
        data: null,
      },
      401
    );
  }

  const isPublicKeyValid =
    typeof publicKey === "string" &&
    publicKey.startsWith("penn_") &&
    publicKey.length >= 16 &&
    publicKey.length <= 40;

  if (!isPublicKeyValid) {
    return c.json(
      {
        success: false,
        message: "Unauthorized: Invalid public key format.",
        data: null,
      },
      401
    );
  }

  const keyRecord = await db.query.newsletterApiKeys.findFirst({
    where: eq(newsletterApiKeys.publicKey, publicKey),
    with: { newsletter: true },
  });

  if (!keyRecord || keyRecord.revokedAt) {
    return c.json(
      {
        success: false,
        message: "Unauthorized: Public key not found or revoked.",
        data: null,
      },
      401
    );
  }

  if (privateKey) {
    try {
      const decryptedPrivateKey = await decryptDataSubtle(
        keyRecord.encryptedSecretKey,
        envConfig.ENCRYPTION_KEY || ""
      );

      if (privateKey !== decryptedPrivateKey) {
        return c.json(
          {
            success: false,
            message: "Unauthorized: Invalid or revoked private key.",
            data: null,
          },
          401
        );
      }

      c.set("newsletter", {
        id: keyRecord.newsletterId,
        apiKeyId: keyRecord.id,
        name: keyRecord.newsletter.name,
        slug: keyRecord.newsletter.slug,
        keyType: "private",
      });
    } catch (err) {
      return c.json(
        {
          success: false,
          message: "Unauthorized: Failed to verify private key.",
          data: null,
        },
        401
      );
    }
  } else {
    c.set("newsletter", {
      id: keyRecord.newsletterId,
      apiKeyId: keyRecord.id,
      name: keyRecord.newsletter.name,
      slug: keyRecord.newsletter.slug,
      keyType: "public",
    });
  }

  await db
    .update(newsletterApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(newsletterApiKeys.id, keyRecord.id));

  await next();
};

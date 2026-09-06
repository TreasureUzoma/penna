import { envConfig } from "@/config";
import { createGroq } from "@ai-sdk/groq";
import { generateObject } from "ai";
import { z } from "zod";

export type ModerationVerdict = "clean" | "review" | "block";

export interface ModerationResult {
  verdict: ModerationVerdict;
  category: string;
  reason: string;
}

const moderationSchema = z.object({
  verdict: z
    .enum(["clean", "review", "block"])
    .describe(
      "clean: ordinary newsletter content. review: borderline/ambiguous — allow the send but flag it for human review. block: high-confidence spam, phishing, scam, hate, or adult content — do not send."
    ),
  category: z
    .string()
    .describe(
      "Short label for the primary concern, e.g. 'clean', 'promotional-spam', 'phishing', 'scam', 'hate', 'adult', or similar."
    ),
  reason: z
    .string()
    .describe("One or two sentences explaining the verdict."),
});

const SYSTEM_PROMPT = `You are a content moderator for a newsletter sending platform. You are given the subject and body of an email a customer is about to send to their own subscribers via our API.

Your job is narrow: catch abuse of our sending infrastructure, not police ordinary marketing tone. Judge intent, not style — flag content that is:
- Phishing or credential-harvesting attempts (fake login pages, "verify your account" scams, impersonating banks/services)
- Scams (advance-fee fraud, fake prizes, crypto/investment pump schemes, romance/urgency scams)
- Unsolicited bulk spam unrelated to any legitimate newsletter purpose
- Hate speech, harassment, or content sexualizing minors
- Explicit adult content

Do NOT flag legitimate content just because it mentions discounts, crypto, dating, health, or politics — those are normal newsletter topics. A real business promoting real products or sharing real updates is "clean" even if salesy. Only use "block" when you're confident the content itself is abusive, not merely because it's promotional. Use "review" when you're genuinely unsure. Default to "clean" for ordinary newsletters.`;

/**
 * Classifies a newsletter's subject+content for spam/phishing/scam intent
 * before it's sent via the external API. Uses Groq (fast/cheap) rather
 * than a generic moderation endpoint, since off-the-shelf moderation APIs
 * are tuned for toxicity/hate/sexual content and largely miss spam and
 * phishing intent, which is the actual abuse vector for a sending
 * platform.
 *
 * Fails open: if the model call errors, times out, or returns something
 * that doesn't parse, this returns a "clean" verdict (category
 * `moderation_unavailable`) rather than blocking the send. A transient AI
 * outage shouldn't take down sending entirely — recipient scoping and the
 * per-newsletter send cap are real defenses on their own.
 */
export const moderateNewsletterContent = async ({
  subject,
  content,
  newsletterName,
}: {
  subject: string;
  content: string;
  newsletterName: string;
}): Promise<ModerationResult> => {
  if (!envConfig.GROQ_API_KEY) {
    return {
      verdict: "clean",
      category: "unchecked",
      reason: "Content moderation is not configured (missing GROQ_API_KEY).",
    };
  }

  try {
    const groq = createGroq({ apiKey: envConfig.GROQ_API_KEY });

    const { object } = await generateObject({
      model: groq("openai/gpt-oss-120b"),
      schema: moderationSchema,
      system: SYSTEM_PROMPT,
      prompt: `Newsletter: ${newsletterName}\n\nSubject: ${subject}\n\nBody:\n${content}`,
      abortSignal: AbortSignal.timeout(10_000),
    });

    return object;
  } catch (error) {
    console.error("Newsletter content moderation check failed:", error);
    return {
      verdict: "clean",
      category: "moderation_unavailable",
      reason:
        error instanceof Error
          ? `Moderation check failed: ${error.message}`
          : "Moderation check failed.",
    };
  }
};

import crypto from "crypto";

export interface SnsMessage {
  Type: "Notification" | "SubscriptionConfirmation" | "UnsubscribeConfirmation";
  MessageId: string;
  TopicArn: string;
  Subject?: string;
  Message: string;
  Timestamp: string;
  SignatureVersion: string;
  Signature: string;
  SigningCertURL: string;
  UnsubscribeURL?: string;
  SubscribeURL?: string;
  Token?: string;
}

const SIGNING_CERT_HOST_RE = /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/i;

/**
 * Confirms a SigningCertURL actually points at AWS SNS before we fetch and
 * trust whatever certificate it serves. Without this check, an attacker
 * could point SigningCertURL at a server they control, serve their own
 * cert there, and sign forged messages with the matching private key —
 * the signature would "verify" against a cert we had no business trusting.
 */
const isTrustedSigningCertUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      SIGNING_CERT_HOST_RE.test(parsed.hostname) &&
      parsed.pathname.endsWith(".pem")
    );
  } catch {
    return false;
  }
};

/**
 * Builds the exact newline-delimited string AWS signed, per
 * https://docs.aws.amazon.com/sns/latest/dg/sns-verify-signature-of-message.html
 * Field order and presence differ by message type — Subject is included
 * only when present, and confirmation messages sign SubscribeURL/Token
 * instead of Subject.
 */
const buildStringToSign = (message: SnsMessage): string => {
  const fields =
    message.Type === "Notification"
      ? (["Message", "MessageId", "Subject", "Timestamp", "TopicArn", "Type"] as const)
      : ([
          "Message",
          "MessageId",
          "SubscribeURL",
          "Timestamp",
          "Token",
          "TopicArn",
          "Type",
        ] as const);

  let stringToSign = "";
  for (const field of fields) {
    const value = message[field as keyof SnsMessage];
    if (field === "Subject" && value === undefined) continue; // omitted entirely when absent
    stringToSign += `${field}\n${value}\n`;
  }
  return stringToSign;
};

// AWS reuses the same handful of signing certs across many messages —
// cache by URL for the life of the process instead of refetching per event.
const certCache = new Map<string, string>();

const getSigningCert = async (url: string): Promise<string> => {
  const cached = certCache.get(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch SNS signing certificate (${res.status})`);
  }
  const pem = await res.text();
  certCache.set(url, pem);
  return pem;
};

/**
 * Verifies that an incoming HTTP(S) payload was really published by AWS
 * SNS. This proves authenticity of *some* SNS topic's message only —
 * callers MUST separately check `message.TopicArn` against their own
 * expected topic ARN, otherwise anyone with an AWS account could stand up
 * their own topic, subscribe your endpoint, and deliver legitimately-
 * signed-but-unrelated messages.
 */
export const verifySnsMessage = async (message: SnsMessage): Promise<boolean> => {
  if (!isTrustedSigningCertUrl(message.SigningCertURL)) return false;
  if (message.SignatureVersion !== "1" && message.SignatureVersion !== "2") {
    return false;
  }

  try {
    const cert = await getSigningCert(message.SigningCertURL);
    const stringToSign = buildStringToSign(message);
    const algorithm =
      message.SignatureVersion === "2" ? "RSA-SHA256" : "RSA-SHA1";

    const verifier = crypto.createVerify(algorithm);
    verifier.update(stringToSign, "utf8");
    return verifier.verify(cert, message.Signature, "base64");
  } catch {
    return false;
  }
};

import { envConfig } from "@/config";

const TURNSTILE_SECRET_KEY = envConfig.TURNSTILE_SECRET_KEY;

type TurnstileResponse = {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
};

export async function validateTurnstile(
  token: string,
  remoteip?: string | null,
): Promise<TurnstileResponse> {
  try {
    const body: Record<string, string> = {
      secret: TURNSTILE_SECRET_KEY!,
      response: token,
    };

    if (remoteip) {
      body.remoteip = remoteip;
    }

    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      return {
        success: false,
        "error-codes": ["internal-error"],
      };
    }

    const result: TurnstileResponse =
      (await response.json()) as TurnstileResponse;

    return result;
  } catch (error) {
    console.error("Turnstile validation error:", error);

    return {
      success: false,
      "error-codes": ["internal-error"],
    };
  }
}

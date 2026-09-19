import { createGroq } from "@ai-sdk/groq";
import { envConfig } from "@/config";

let groqInstance: ReturnType<typeof createGroq> | null = null;

/**
 * Get or create a singleton Groq instance
 */
export function getGroq() {
  if (!groqInstance) {
    if (!envConfig.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY is missing in environment variables");
    }
    groqInstance = createGroq({
      apiKey: envConfig.GROQ_API_KEY,
    });
  }
  return groqInstance;
}

import "server-only";
import { createGroq } from "@ai-sdk/groq";

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export function groqModel() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return createGroq({ apiKey })(process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL);
}

export const aiDisabled = () =>
  Response.json({ error: "AI is not configured. Add GROQ_API_KEY to your environment." }, { status: 501 });

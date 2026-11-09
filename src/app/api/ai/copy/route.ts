import { auth } from "@clerk/nextjs/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { aiDisabled, groqModel } from "@/lib/ai";

export const maxDuration = 30;

const requestSchema = z.object({
  text: z.string().max(2000),
  instruction: z.string().trim().min(2).max(300),
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const model = groqModel();
  if (!model) return aiDisabled();

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Tell the AI what to write." }, { status: 400 });

  try {
    const { output } = await generateText({
      model,
      output: Output.object({
        schema: z.object({ variants: z.array(z.string()).min(1).max(3) }),
      }),
      system:
        "You write short, punchy copy for graphic designs (social posts, posters, thumbnails, slides). " +
        "Return exactly 3 distinct variants. Keep roughly the original length unless asked otherwise. " +
        "Plain text only: no quotes, hashtags or emoji unless requested.",
      prompt: `Current text: ${parsed.data.text || "(empty)"}\nInstruction: ${parsed.data.instruction}`,
    });
    return Response.json({ variants: output.variants });
  } catch (error) {
    console.error("ai/copy failed", error);
    return Response.json({ error: "The AI couldn't write that. Try again." }, { status: 502 });
  }
}

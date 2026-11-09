import { auth } from "@clerk/nextjs/server";
import { generateText, Output } from "ai";
import { z } from "zod";
import { aiDisabled, groqModel } from "@/lib/ai";

export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().trim().min(3).max(600),
  width: z.number().int().min(16).max(8000),
  height: z.number().int().min(16).max(8000),
});

// Every field is required (nullable instead of optional) so it works with strict JSON schema mode.
const layoutSchema = z.object({
  background: z.string().describe("Hex color like #ffeedd"),
  elements: z
    .array(
      z.object({
        kind: z.enum(["rect", "ellipse", "triangle", "star", "text"]),
        name: z.string().describe("Short layer name, e.g. 'Headline'"),
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        rotation: z.number(),
        fill: z.string().describe("Hex color"),
        cornerRadius: z.number().nullable(),
        text: z.string().nullable().describe("Only for kind=text"),
        fontSize: z.number().nullable(),
        bold: z.boolean().nullable(),
        align: z.enum(["left", "center", "right"]).nullable(),
      }),
    )
    .max(24),
});

export type AiLayout = z.infer<typeof layoutSchema>;

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const model = groqModel();
  if (!model) return aiDisabled();

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) return Response.json({ error: "Describe your design in a few words." }, { status: 400 });
  const { prompt, width, height } = parsed.data;

  try {
    const { output } = await generateText({
      model,
      output: Output.object({ schema: layoutSchema }),
      system: [
        "You are a senior graphic designer laying out a design on a canvas.",
        `The canvas is ${width}x${height} pixels; origin is top-left. Keep important content inside a ${Math.round(
          Math.min(width, height) * 0.06,
        )}px safe margin.`,
        "Return 4-14 elements, listed back-to-front. Use decorative shapes for depth and 1-4 text elements with clear hierarchy.",
        "Text: width is the text box width; height ≈ fontSize × 1.2 × line count. Headlines are large (8-14% of canvas height) and bold.",
        "Use a cohesive 3-5 color palette with strong contrast between text and what is behind it.",
        "Shapes may bleed past the canvas edge for a modern look; text must not.",
      ].join("\n"),
      prompt,
    });
    return Response.json({ layout: output });
  } catch (error) {
    console.error("ai/design failed", error);
    return Response.json({ error: "The AI couldn't produce a layout. Try rephrasing." }, { status: 502 });
  }
}

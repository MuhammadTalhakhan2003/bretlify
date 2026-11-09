import { auth } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { sql, type ProjectSummary } from "@/lib/db";
import { documentSchema, MAX_DOCUMENT_BYTES } from "@/lib/projects";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const projects = (await sql`
    SELECT id, title, shared, updated_at, document
    FROM projects WHERE owner_id = ${userId}
    ORDER BY updated_at DESC LIMIT 200
  `) as ProjectSummary[];
  return Response.json({ projects });
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  document: documentSchema,
});

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const raw = await req.text();
  if (raw.length > MAX_DOCUMENT_BYTES) return Response.json({ error: "Design is too large" }, { status: 413 });
  const parsed = createSchema.safeParse(JSON.parse(raw || "{}"));
  if (!parsed.success) return Response.json({ error: "Invalid design" }, { status: 400 });

  const id = nanoid(12);
  const title = parsed.data.title ?? "Untitled design";
  await sql`
    INSERT INTO projects (id, owner_id, title, document)
    VALUES (${id}, ${userId}, ${title}, ${JSON.stringify(parsed.data.document)})
  `;
  return Response.json({ id }, { status: 201 });
}

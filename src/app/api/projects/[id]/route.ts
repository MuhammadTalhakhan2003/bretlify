import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { sql } from "@/lib/db";
import { documentSchema, getAccessibleProject, MAX_DOCUMENT_BYTES } from "@/lib/projects";

export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const project = await getAccessibleProject(id, userId);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({
    project: {
      id: project.id,
      title: project.title,
      document: project.document,
      shared: project.shared,
      isOwner: project.owner_id === userId,
      updatedAt: project.updated_at,
    },
  });
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  document: documentSchema.optional(),
  shared: z.boolean().optional(),
});

export async function PATCH(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const raw = await req.text();
  if (raw.length > MAX_DOCUMENT_BYTES) return Response.json({ error: "Design is too large" }, { status: 413 });
  const parsed = patchSchema.safeParse(JSON.parse(raw || "{}"));
  if (!parsed.success) return Response.json({ error: "Invalid update" }, { status: 400 });

  const project = await getAccessibleProject(id, userId);
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  const isOwner = project.owner_id === userId;
  // Collaborators may edit the design; only the owner can rename or change sharing.
  if (!isOwner && (parsed.data.shared !== undefined || parsed.data.title !== undefined)) {
    return Response.json({ error: "Only the owner can do that" }, { status: 403 });
  }

  const { title, document, shared } = parsed.data;
  await sql`
    UPDATE projects SET
      title = COALESCE(${title ?? null}, title),
      document = COALESCE(${document ? JSON.stringify(document) : null}::jsonb, document),
      shared = COALESCE(${shared ?? null}, shared),
      updated_at = NOW()
    WHERE id = ${id}
  `;
  return Response.json({ ok: true });
}

/** navigator.sendBeacon can only POST; treat it as a PATCH for flush-on-close saves. */
export const POST = PATCH;

export async function DELETE(_req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;

  const deleted = await sql`DELETE FROM projects WHERE id = ${id} AND owner_id = ${userId} RETURNING id`;
  if (deleted.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ ok: true });
}

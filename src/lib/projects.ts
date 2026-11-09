import "server-only";
import { z } from "zod";
import { sql, type ProjectRow } from "@/lib/db";

/** Loose structural check: enough to reject garbage without re-describing every element field. */
export const documentSchema = z.object({
  version: z.literal(1),
  artboard: z.object({
    width: z.number().int().min(16).max(8000),
    height: z.number().int().min(16).max(8000),
    background: z.string().max(32),
  }),
  elements: z
    .array(
      z
        .object({
          id: z.string().min(1).max(64),
          type: z.enum(["rect", "ellipse", "triangle", "star", "text", "image", "draw"]),
        })
        .passthrough(),
    )
    .max(2000),
});

export const MAX_DOCUMENT_BYTES = 3_500_000;

/** A project is visible to its owner, and to any signed-in user once the owner shares it. */
export async function getAccessibleProject(id: string, userId: string) {
  const rows = (await sql`
    SELECT * FROM projects WHERE id = ${id} AND (owner_id = ${userId} OR shared = TRUE) LIMIT 1
  `) as ProjectRow[];
  return rows[0] ?? null;
}

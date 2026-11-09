import "server-only";
import { neon } from "@neondatabase/serverless";
import type { DesignDocument } from "@/lib/types";

export const sql = neon(process.env.DATABASE_URL!);

export interface ProjectRow {
  id: string;
  owner_id: string;
  title: string;
  document: DesignDocument;
  shared: boolean;
  created_at: string;
  updated_at: string;
}

export type ProjectSummary = Pick<ProjectRow, "id" | "title" | "shared" | "updated_at" | "document">;

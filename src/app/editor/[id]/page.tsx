import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import Editor from "@/components/editor/Editor";

export const metadata: Metadata = { title: "Editor · Bretlify" };

/** Cloud project: loads from Postgres, autosaves, and joins the live collaboration room. */
export default async function Page({ params }: PageProps<"/editor/[id]">) {
  await auth.protect();
  const { id } = await params;
  return <Editor key={id} projectId={id} />;
}

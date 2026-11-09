import type { Metadata } from "next";
import Editor from "@/components/editor/Editor";

export const metadata: Metadata = { title: "Editor · Bretlify" };

/** Browser-only editor: no account needed, autosaves to this device. */
export default function Page() {
  return <Editor />;
}

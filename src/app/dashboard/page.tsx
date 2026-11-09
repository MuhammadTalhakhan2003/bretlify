import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { Dashboard } from "@/components/Dashboard";

export const metadata: Metadata = { title: "Your designs · Bretlify" };

export default async function Page() {
  await auth.protect();
  return <Dashboard />;
}

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/editor/Logo";

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="workspace-dots flex min-h-full flex-col items-center justify-center gap-6 overflow-y-auto p-6">
      <Link href="/" className="flex items-center gap-2">
        <Logo size={36} />
        <span className="text-2xl font-semibold tracking-tight">
          Bret<span className="text-flesh-500">lify</span>
        </span>
      </Link>
      {children}
    </div>
  );
}

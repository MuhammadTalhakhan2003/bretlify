import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";

export default function Page() {
  return (
    <AuthShell>
      <SignIn fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}

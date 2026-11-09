import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/AuthShell";

export default function Page() {
  return (
    <AuthShell>
      <SignUp fallbackRedirectUrl="/dashboard" />
    </AuthShell>
  );
}

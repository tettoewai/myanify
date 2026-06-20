import Link from "next/link";

interface AuthLegalNoticeProps {
  action:
    | "signing in"
    | "registering"
    | "requesting a password reset"
    | "resetting your password";
}

export function AuthLegalNotice({ action }: AuthLegalNoticeProps) {
  return (
    <span className="text-sm text-muted-foreground mt-4">
      By {action}, you agree to our{" "}
      <Link href="/terms" className="text-primary hover:underline">
        Terms of Service
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="text-primary hover:underline">
        Privacy Policy
      </Link>
    </span>
  );
}

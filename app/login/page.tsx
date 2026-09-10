"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AuthEmailDivider } from "@/components/auth/auth-email-divider";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthLegalNotice } from "@/components/auth/auth-legal-notice";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { SpotifySignInButton } from "@/components/auth/spotify-sign-in-button";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";
import { Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const callbackUrl = searchParams.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      console.log("SignIn result:", result);

      if (result?.error) {
        // Check if the error is from our custom throw
        // The error might be in the URL or in the error object
        if (
          result.error === "EMAIL_NOT_VERIFIED" ||
          result.error?.includes("EMAIL_NOT_VERIFIED") ||
          result.error === "AccessDenied"
        ) {
          setVerificationEmail(email);
          setNeedsVerification(true);
          toast.error("Please verify your email before signing in");
          setIsLoading(false);
          return;
        }

        // Check for the error in the URL (NextAuth sometimes puts errors there)
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get("error");
        if (errorParam === "EMAIL_NOT_VERIFIED") {
          setVerificationEmail(email);
          setNeedsVerification(true);
          toast.error("Please verify your email before signing in");
          setIsLoading(false);
          return;
        }

        if (result.error === "CredentialsSignin") {
          toast.error("Invalid email or password");
        } else {
          toast.error("An error occurred. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      // Success - continue with login
      await update();
      sessionStorage.removeItem("loginEmail");

      const response = await fetch("/api/auth/session");
      const sessionData = await response.json();

      if (sessionData?.user?.role) {
        const redirectUrl = getAuthRedirectUrl(
          callbackUrl,
          sessionData.user.role,
        );
        router.push(redirectUrl);
        router.refresh();
      } else {
        router.push(callbackUrl || "/home");
        router.refresh();
      }
    } catch (error: any) {
      console.error("Login error:", error);
      // Check if error contains verification message
      if (
        error?.message?.includes("verify") ||
        error?.message?.includes("EMAIL_NOT_VERIFIED")
      ) {
        setVerificationEmail(email);
        setNeedsVerification(true);
        toast.error("Please verify your email before signing in");
      } else {
        toast.error("An error occurred. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Verification email resent!");
        setNeedsVerification(false);
      } else {
        toast.error(data.error || "Failed to resend verification email");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  // Show verification required state
  if (needsVerification) {
    return (
      <AuthFormCard>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Verify Your Email
          </h3>
          <p className="text-muted-foreground text-sm">
            Please verify your email address before signing in.
          </p>
          <p className="text-muted-foreground text-sm">
            We sent a verification link to{" "}
            <span className="font-medium text-foreground">
              {verificationEmail}
            </span>
          </p>
          <div className="space-y-2 mt-4">
            <Button className="w-full" onClick={handleResendVerification}>
              <Mail className="w-4 h-4 mr-2" />
              Resend verification email
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                setNeedsVerification(false);
              }}
            >
              ← Back to sign in
            </Button>
          </div>
        </div>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard>
      <AuthPageHeader subtitle="Sign in to your account" />

      <div className="space-y-4">
        <GoogleSignInButton />
        <SpotifySignInButton />
        <AuthEmailDivider />
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="email@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            autoFocus
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
    </AuthFormCard>
  );
}

export default function LoginPage() {
  return (
    <AuthPageShell>
      <LoginForm />
      <div className="flex flex-col items-center justify-center gap-1 mt-4">
        <span className="text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-primary hover:underline">
            Register
          </Link>
        </span>
        <span className="text-sm text-muted-foreground">
          Forgot your password?{" "}
          <Link
            href="/forgot-password"
            className="text-primary hover:underline"
          >
            Reset Password
          </Link>
        </span>
      </div>
      <AuthLegalNotice action="signing in" />
    </AuthPageShell>
  );
}

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
import { getAuthRedirectUrl, SPOTIFY_LOGIN_ENABLED } from "@/lib/auth-redirect";
import { PasswordStrength } from "@/components/ui/password-strength";
import { Mail, ArrowLeft, Clock } from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { update } = useSession();
  const callbackUrl = searchParams.get("callbackUrl");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        toast.error(registerData.error || "Failed to create account");
        setIsLoading(false);
        return;
      }

      // Handle verification required
      if (registerData.requiresVerification) {
        setNeedsVerification(true);
        setRegisteredEmail(email);
        toast.success(registerData.message);
        setIsLoading(false);
        return;
      }

      // Auto-login for existing verified users (legacy flow)
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(
          "Account created, but sign-in failed. Please try logging in.",
        );
        setIsLoading(false);
        return;
      }

      await update();

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
    } catch {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Show verification required state with expiry info
  if (needsVerification) {
    return (
      <AuthFormCard>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Verify Your Email
          </h3>
          <p className="text-muted-foreground text-sm">
            We&apos;ve sent a verification link to{" "}
            <span className="font-medium text-foreground">
              {registeredEmail}
            </span>
          </p>
          <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>Link expires in 24 hours</span>
            </div>
            <p className="text-muted-foreground">
              Click the link in the email to activate your account.
            </p>
          </div>
          <div className="space-y-2 mt-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={async () => {
                try {
                  const response = await fetch(
                    "/api/auth/resend-verification",
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email: registeredEmail }),
                    },
                  );

                  if (response.ok) {
                    const data = await response.json();
                    toast.success(data.message || "Verification email resent!");
                  } else {
                    const data = await response.json();
                    toast.error(
                      data.error || "Failed to resend verification email",
                    );
                  }
                } catch {
                  toast.error("An error occurred");
                }
              }}
            >
              Resend verification email
            </Button>
            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => router.push("/login")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to sign in
            </Button>
          </div>
        </div>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard>
      <AuthPageHeader subtitle="Create your account" />

      <div className="space-y-4">
        <GoogleSignInButton />
        {/* Spotify login disabled via SPOTIFY_LOGIN_ENABLED in lib/auth-redirect.ts */}
        {SPOTIFY_LOGIN_ENABLED && <SpotifySignInButton />}
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
            minLength={6}
          />
          <PasswordStrength password={password} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Creating account..." : "Create account"}
        </Button>
      </form>
    </AuthFormCard>
  );
}

export default function RegisterPage() {
  return (
    <AuthPageShell>
      <RegisterForm />
      <div className="flex flex-col items-center justify-center gap-1 mt-4">
        <span className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </span>
      </div>
      <AuthLegalNotice action="registering" />
    </AuthPageShell>
  );
}

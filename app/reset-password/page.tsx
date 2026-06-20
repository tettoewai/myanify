"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { toast } from "sonner";
import Link from "next/link";
import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthLegalNotice } from "@/components/auth/auth-legal-notice";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { CheckCircle, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { PasswordStrength } from "@/components/ui/password-strength";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [isResetComplete, setIsResetComplete] = useState(false);

  useEffect(() => {
    // Validate token on mount
    const validateToken = async () => {
      if (!token) {
        setIsValidToken(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/auth/validate-reset-token?token=${token}`,
        );
        const data = await response.json();

        if (response.ok && data.valid) {
          setIsValidToken(true);
        } else {
          setIsValidToken(false);
        }
      } catch {
        setIsValidToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to reset password");
        setIsLoading(false);
        return;
      }

      setIsResetComplete(true);
      toast.success("Password reset successfully!");
    } catch {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  // Loading state
  if (isValidToken === null) {
    return (
      <AuthFormCard>
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 mx-auto text-primary animate-spin" />
          <p className="mt-4 text-muted-foreground">
            Verifying your request...
          </p>
        </div>
      </AuthFormCard>
    );
  }

  // Invalid token
  if (isValidToken === false) {
    return (
      <AuthFormCard>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Invalid or expired link
          </h3>
          <p className="text-muted-foreground text-sm">
            The password reset link is invalid or has expired.
          </p>
          <Button
            className="mt-4"
            onClick={() => router.push("/forgot-password")}
          >
            Request new reset link
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={() => router.push("/login")}
          >
            Back to sign in
          </Button>
        </div>
      </AuthFormCard>
    );
  }

  // Reset complete
  if (isResetComplete) {
    return (
      <AuthFormCard>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Password reset successful
          </h3>
          <p className="text-muted-foreground text-sm">
            Your password has been reset. You can now sign in with your new
            password.
          </p>
          <Button className="mt-4" onClick={() => router.push("/login")}>
            Sign in
          </Button>
        </div>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard>
      <AuthPageHeader subtitle="Create a new password" />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password">New password</Label>
          <Input
            id="password"
            type="password"
            placeholder="Enter your new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
            autoFocus
          />
          <PasswordStrength password={password} />
          <p className="text-xs text-muted-foreground">
            Must be at least 6 characters
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm new password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm your new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isLoading}
            minLength={6}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Resetting..." : "Reset password"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => router.push("/login")}
          disabled={isLoading}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Button>
      </form>
    </AuthFormCard>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <Suspense
        fallback={
          <AuthFormCard>
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
              <p className="mt-4 text-muted-foreground">Loading...</p>
            </div>
          </AuthFormCard>
        }
      >
        <ResetPasswordForm />
      </Suspense>
      <AuthLegalNotice action="resetting your password" />
    </AuthPageShell>
  );
}

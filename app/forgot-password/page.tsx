"use client";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthLegalNotice } from "@/components/auth/auth-legal-notice";
import { AuthPageHeader } from "@/components/auth/auth-page-header";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";

function ForgotPasswordForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send reset link");
        setIsLoading(false);
        return;
      }

      setIsEmailSent(true);
      toast.success("Password reset link sent to your email");
    } catch {
      toast.error("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  if (isEmailSent) {
    return (
      <AuthFormCard>
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground">
            Check your email
          </h3>
          <p className="text-muted-foreground text-sm">
            We&apos;ve sent a password reset link to{" "}
            <span className="font-medium text-foreground">{email}</span>
          </p>
          <p className="text-muted-foreground text-sm">
            If you don&apos;t see it, please check your spam folder.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/login")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Button>
        </div>
      </AuthFormCard>
    );
  }

  return (
    <AuthFormCard>
      <AuthPageHeader subtitle="Enter your email to receive a password reset link" />

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

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Sending..." : "Send reset link"}
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

export default function ForgotPasswordPage() {
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
        <ForgotPasswordForm />
      </Suspense>
      <AuthLegalNotice action="requesting a password reset" />
    </AuthPageShell>
  );
}

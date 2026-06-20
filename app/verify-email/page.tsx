"use client";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Loader2, Mail, XCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { toast } from "sonner";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [email, setEmail] = useState("");

  const [status, setStatus] = useState<
    "loading" | "success" | "error" | "expired"
  >("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus("error");
        setMessage("No verification token provided");
        return;
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`);
        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          setMessage("Your email has been verified successfully!");

          // Auto-redirect after 5 seconds
          setTimeout(() => {
            router.push("/login");
          }, 5000);
        } else if (data.expired) {
          setStatus("expired");
          setMessage(data.error || "Verification link has expired");
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to verify email");
        }
      } catch {
        setStatus("error");
        setMessage("An error occurred. Please try again.");
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendVerification = async () => {
    if (!email) {
      // Show a dialog to enter email
      const userEmail = prompt("Please enter your email address:");
      if (!userEmail) return;
      setEmail(userEmail);
      await sendResendRequest(userEmail);
    } else {
      await sendResendRequest(email);
    }
  };

  const sendResendRequest = async (emailAddress: string) => {
    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailAddress }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Verification email resent!");
        setStatus("loading");
        setMessage("New verification link sent. Please check your email.");
      } else {
        toast.error(data.error || "Failed to resend verification email");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  return (
    <AuthFormCard>
      <div className="text-center space-y-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <h3 className="text-xl font-semibold text-foreground">
              Verifying your email...
            </h3>
            <p className="text-muted-foreground text-sm">
              Please wait while we confirm your email address.
            </p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Email Verified! 🎉
            </h3>
            <p className="text-muted-foreground text-sm">{message}</p>
            <p className="text-muted-foreground text-sm">
              You can now sign in and start enjoying Myanmar music with
              synchronized lyrics.
            </p>
            <p className="text-xs text-muted-foreground">
              Redirecting to sign in...
            </p>
            <Button
              className="w-full mt-4"
              onClick={() => router.push("/login")}
            >
              Sign In Now
            </Button>
          </>
        )}

        {status === "expired" && (
          <>
            <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Link Expired
            </h3>
            <p className="text-muted-foreground text-sm">{message}</p>
            <p className="text-muted-foreground text-sm">
              Verification links are valid for 24 hours for security reasons.
            </p>
            <div className="space-y-2 mt-4">
              <Button className="w-full" onClick={handleResendVerification}>
                <Mail className="w-4 h-4 mr-2" />
                Resend Verification Email
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => router.push("/login")}
              >
                Back to sign in
              </Button>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">
              Verification Failed
            </h3>
            <p className="text-muted-foreground text-sm">{message}</p>
            <div className="space-y-2 mt-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push("/register")}
              >
                Try registering again
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => router.push("/login")}
              >
                Back to sign in
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthFormCard>
  );
}

export default function VerifyEmailPage() {
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
        <VerifyEmailContent />
      </Suspense>
    </AuthPageShell>
  );
}

"use client";

import { useEffect, Suspense } from "react";
import { UserRole } from "@prisma/client";
import { useSession } from "next-auth/react";
import { LoginPageSkeleton } from "@/components/loading-skeletons";
import { useRouter, useSearchParams } from "next/navigation";

function AuthCallbackContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/home";

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      // Use callbackUrl if provided, otherwise redirect based on role
      if (
        callbackUrl &&
        callbackUrl !== "/login" &&
        callbackUrl !== "/auth/callback"
      ) {
        router.push(callbackUrl);
      } else {
        // Fallback to role-based routing
        const destination =
          session.user.role === UserRole.ADMIN ? "/admin" : "/home";
        router.push(destination);
      }
    } else if (status === "unauthenticated") {
      // If not authenticated, redirect to login with return URL
      const returnUrl = callbackUrl !== "/login" ? callbackUrl : "/home";
      router.push(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [status, session, router, callbackUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <LoginPageSkeleton />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
          <LoginPageSkeleton />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { LoginPageSkeleton } from "@/components/loading-skeletons";
import { useRouter } from "next/navigation";

export default function AuthCallbackPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role) {
      router.push("/home");
    } else if (status === "unauthenticated") {
      // If not authenticated, redirect to login
      router.push("/login");
    }
  }, [status, session, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <LoginPageSkeleton />
    </div>
  );
}

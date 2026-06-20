"use client";

import type React from "react";
import { Suspense } from "react";
import { LoginPageSkeleton } from "@/components/loading-skeletons";

interface AuthPageShellProps {
  children: React.ReactNode;
}

export function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <Suspense fallback={<LoginPageSkeleton />}>{children}</Suspense>
    </div>
  );
}

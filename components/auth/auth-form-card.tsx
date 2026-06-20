import type React from "react";

interface AuthFormCardProps {
  children: React.ReactNode;
}

export function AuthFormCard({ children }: AuthFormCardProps) {
  return <div className="w-full max-w-md space-y-8">{children}</div>;
}

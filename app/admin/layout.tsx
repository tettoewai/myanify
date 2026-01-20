"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Myanify Admin</h1>
          {session?.user?.role === "ADMIN" && (
            <div className="flex items-center gap-3">
              <span className="hidden md:inline text-sm text-muted-foreground">
                Switch to music app
              </span>
              <Button size="sm" variant="outline" asChild>
                <Link href="/">Go to app</Link>
              </Button>
            </div>
          )}
        </div>
        <div className="p-6 flex-1">{children}</div>
      </main>
    </div>
  );
}

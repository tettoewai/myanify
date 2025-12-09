"use client";

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        {/* <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign Out
            </button>
          </div>
        </div> */}
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

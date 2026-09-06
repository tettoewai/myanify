"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useAnnouncements } from "@/lib/swr";
import { cn } from "@/lib/utils";

export function AnnouncementBell({ className }: { className?: string }) {
  const { unreadCount } = useAnnouncements({ limit: 20 });
  return (
    <Link
      href="/announcements"
      aria-label={
        unreadCount > 0
          ? `What's new, ${unreadCount} unread`
          : "What's new"
      }
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className,
      )}
    >
      <Bell className="w-5 h-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-bold text-primary-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}

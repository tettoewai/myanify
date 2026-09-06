"use client";

import Link from "next/link";
import { BellRing, ChevronRight } from "lucide-react";
import { useAnnouncements } from "@/lib/swr";

/** Slim banner on Home when there are unread announcements. */
export function AnnouncementBanner() {
  const { announcements, unreadCount } = useAnnouncements({ limit: 5 });
  const latest = announcements.find((a) => !a.read) ?? announcements[0];
  if (!latest) return null;
  return (
    <Link
      href="/announcements"
      className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 hover:bg-primary/15 transition-colors"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
        <BellRing className="h-5 w-5 text-primary" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground truncate">
          {latest.title}
        </span>
        <span className="block text-xs text-muted-foreground truncate">
          {unreadCount > 1
            ? `${unreadCount} new updates — tap to see what's new`
            : "New update — tap to read"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

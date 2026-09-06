"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { BellRing, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useAnnouncements,
  markAnnouncementsRead,
  type AnnouncementItem,
} from "@/lib/swr";
import useSWR from "swr";
import { swrFetcher } from "@/lib/api-client";

function AnnouncementCard({ item }: { item: AnnouncementItem }) {
  const href = item.linkUrl
    ? item.linkUrl.startsWith("http")
      ? item.linkUrl
      : item.linkUrl
    : null;
  const external = !!item.linkUrl?.startsWith("http");
  const inner = (
    <>
      {item.imageUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-xl border border-border/60">
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-foreground">{item.title}</h2>
        {!item.read && (
          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
            New
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-line">
        {item.body}
      </p>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span>{new Date(item.startsAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</span>
        {href && (
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            Open {external && <ExternalLink className="h-3 w-3" />}
          </span>
        )}
      </div>
    </>
  );
  const cls =
    "block rounded-2xl border border-border/60 bg-card p-5 space-y-3 shadow-sm hover:border-primary/40 transition-colors";
  if (!href) return <article className={cls}>{inner}</article>;
  if (external)
    return (
      <a href={href} target="_blank" rel="noreferrer" className={cls}>
        {inner}
      </a>
    );
  return (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  );
}

function AppVersionCard() {
  const { data } = useSWR("/api/mobile-update", swrFetcher, {
    revalidateOnFocus: false,
  });
  const version = data?.version as string | undefined;
  const notes = data?.notes as string | undefined;
  if (!version) return null;
  return (
    <Card className="border-border/60 shadow-sm">
      <CardContent className="p-5 space-y-2">
        <p className="text-sm font-semibold">
          Latest app version: v{version}
        </p>
        {notes && (
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function AnnouncementsPage() {
  const { announcements, isLoading, isError, mutate } = useAnnouncements({
    limit: 30,
  });

  const unreadIds = useMemo(
    () => announcements.filter((a) => !a.read).map((a) => a.id),
    [announcements],
  );

  useEffect(() => {
    if (unreadIds.length === 0) return;
    const t = setTimeout(() => {
      markAnnouncementsRead(unreadIds).then(() => mutate());
    }, 1500);
    return () => clearTimeout(t);
  }, [unreadIds.join(","), mutate]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-full p-4 md:p-6 lg:p-8 pb-32">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <BellRing className="h-6 w-6 text-primary" />
            What&apos;s New
          </h1>
          <p className="text-muted-foreground text-sm">
            Announcements, new releases, and app updates
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="rounded-2xl border p-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <Card className="border-destructive/30">
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <p className="font-semibold">Couldn&apos;t load updates</p>
              <Button variant="outline" onClick={() => mutate()} className="gap-2">
                <RefreshCw className="w-4 h-4" /> Retry
              </Button>
            </CardContent>
          </Card>
        ) : announcements.length === 0 ? (
          <Card className="border-border/60">
            <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
              <BellRing className="h-10 w-10 text-muted-foreground" />
              <p className="font-semibold">You&apos;re all caught up</p>
              <p className="text-sm text-muted-foreground">
                New announcements will appear here.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <AnnouncementCard key={a.id} item={a} />
            ))}
          </div>
        )}

        <AppVersionCard />
      </div>
    </div>
  );
}

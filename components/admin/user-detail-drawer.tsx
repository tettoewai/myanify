"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { useAdminUserDetail } from "@/lib/swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn, getInitials } from "@/lib/utils";
import {
  Crown,
  ShieldCheck,
  MailCheck,
  MailWarning,
  Smartphone,
  Monitor,
  Music,
  ListMusic,
  Heart,
  History,
  CreditCard,
  Download,
  FileMusic,
} from "lucide-react";

interface UserDetailDrawerProps {
  userId: string | null;
  onClose: () => void;
  onMakeVip: (user: { id: string; email: string; isPremium: boolean }) => void;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status?.toUpperCase();
  const className =
    normalized === "ACTIVE" || normalized === "VERIFIED"
      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      : normalized === "PENDING"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
        : normalized === "EXPIRED" || normalized === "REJECTED"
          ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
          : "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("text-[11px]", className)}>
      {status}
    </Badge>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[11px] font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="mt-1 text-xl font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
    </div>
  );
}

export function UserDetailDrawer({
  userId,
  onClose,
  onMakeVip,
}: UserDetailDrawerProps) {
  const open = Boolean(userId);
  const { detail, isLoading } = useAdminUserDetail(userId);

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l bg-background shadow-xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <DialogPrimitive.Title className="sr-only">
            {detail
              ? `Details for ${detail.name || detail.email}`
              : "Loading user details"}
          </DialogPrimitive.Title>
          <div className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div className="flex items-center gap-3 min-w-0">
              {isLoading || !detail ? (
                <>
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-40" />
                    <Skeleton className="h-4 w-52" />
                  </div>
                </>
              ) : (
                <>
                  {detail.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={detail.avatarUrl}
                      alt={detail.name || detail.email}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      title={detail.name || detail.email}
                      className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary uppercase"
                    >
                      {getInitials(detail.name, detail.email)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-lg font-semibold">
                      {detail.name || "Unnamed user"}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {detail.email}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={
                          detail.role === "ADMIN" ? "default" : "secondary"
                        }
                        className="text-[11px]"
                      >
                        <ShieldCheck className="mr-1 h-3 w-3" />
                        {detail.role}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[11px]",
                          detail.isPremium
                            ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground"
                        )}
                      >
                        <Crown className="mr-1 h-3 w-3" />
                        {detail.isPremium ? "VIP" : "Free"}
                      </Badge>
                      {detail.emailVerified ? (
                        <Badge
                          variant="outline"
                          className="border-green-500/20 bg-green-500/10 text-[11px] text-green-600 dark:text-green-400"
                        >
                          <MailCheck className="mr-1 h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[11px] text-muted-foreground"
                        >
                          <MailWarning className="mr-1 h-3 w-3" />
                          Unverified
                        </Badge>
                      )}
                      {(detail.accounts ?? []).map((a: { provider: string }) => (
                        <Badge
                          key={a.provider}
                          variant="secondary"
                          className="text-[11px] capitalize"
                        >
                          {a.provider}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {detail && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    onMakeVip({
                      id: detail.id,
                      email: detail.email,
                      isPremium: detail.isPremium,
                    })
                  }
                >
                  {detail.isPremium ? "Remove VIP" : "Make VIP"}
                </Button>
              )}
              <DialogPrimitive.Close asChild>
                <Button variant="ghost" size="icon" aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </DialogPrimitive.Close>
            </div>
          </div>

          {isLoading || !detail ? (
            <div className="space-y-3 p-5">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : (
            <Tabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-border px-5 pt-3">
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="devices">Devices</TabsTrigger>
                </TabsList>
              </div>

              <ScrollArea className="min-h-0 flex-1">
                <div className="p-5">
                  <TabsContent value="overview" className="space-y-5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <StatTile
                        icon={History}
                        label="Plays"
                        value={detail._count?.playHistory ?? 0}
                      />
                      <StatTile
                        icon={ListMusic}
                        label="Playlists"
                        value={detail._count?.playlists ?? 0}
                      />
                      <StatTile
                        icon={Heart}
                        label="Liked songs"
                        value={detail._count?.likedSongs ?? 0}
                      />
                      <StatTile
                        icon={Music}
                        label="Liked artists"
                        value={detail._count?.likedArtists ?? 0}
                      />
                      <StatTile
                        icon={CreditCard}
                        label="Payments"
                        value={detail._count?.paymentRequests ?? 0}
                      />
                      <StatTile
                        icon={Download}
                        label="Downloads"
                        value={detail._count?.offlineDownloads ?? 0}
                      />
                      <StatTile
                        icon={Smartphone}
                        label="Devices"
                        value={detail._count?.deviceLicenses ?? 0}
                      />
                      <StatTile
                        icon={FileMusic}
                        label="Requests"
                        value={detail._count?.songRequests ?? 0}
                      />
                    </div>

                    <div className="rounded-lg border border-border p-4 text-sm space-y-2">
                      <h4 className="font-semibold text-foreground">
                        Account info
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                        <span>Joined</span>
                        <span className="text-right text-foreground">
                          {formatDate(detail.createdAt)}
                        </span>
                        <span>Last updated</span>
                        <span className="text-right text-foreground">
                          {formatDate(detail.updatedAt)}
                        </span>
                        <span>Active sessions</span>
                        <span className="text-right text-foreground">
                          {detail._count?.sessions ?? 0}
                        </span>
                        <span>Subscription</span>
                        <span className="text-right text-foreground">
                          {detail.subscriptions?.[0]
                            ? `${detail.subscriptions[0].planType} (${detail.subscriptions[0].status})`
                            : detail.isPremium
                              ? "VIP access"
                              : "Free"}
                        </span>
                        {detail.subscriptions?.[0]?.endDate && (
                          <>
                            <span>Sub ends</span>
                            <span className="text-right text-foreground">
                              {formatDate(detail.subscriptions[0].endDate)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Recent playlists ({detail.playlists?.length ?? 0} shown)
                      </h4>
                      {(detail.playlists ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No playlists yet.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.playlists.map((p: any) => (
                            <div
                              key={p.id}
                              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">{p.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {p._count?.songs ?? 0} songs ·{" "}
                                  {formatDate(p.createdAt)}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className="text-[11px]"
                              >
                                {p.isPublic ? "Public" : "Private"}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Liked artists
                      </h4>
                      {(detail.likedArtists ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No liked artists.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {detail.likedArtists.map((l: any) => (
                            <Badge key={l.artist.id} variant="secondary">
                              {l.artist.name}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="activity" className="space-y-4">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Recent plays
                      </h4>
                      {(detail.playHistory ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No listening history.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.playHistory.map((h: any) => (
                            <div
                              key={h.id}
                              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                            >
                              {h.song?.coverUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={h.song.coverUrl}
                                  alt={h.song.title}
                                  className="h-9 w-9 rounded-md object-cover"
                                />
                              ) : (
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                                  <Music className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">
                                  {h.song?.title ?? "Unknown song"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {(h.song?.artists ?? [])
                                    .map((a: any) => a.artist?.name)
                                    .filter(Boolean)
                                    .join(", ") || "Unknown artist"}{" "}
                                  · {formatDateTime(h.playedAt)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Liked songs
                      </h4>
                      {(detail.likedSongs ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No liked songs.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.likedSongs.map((l: any) => (
                            <div
                              key={`${l.song?.id}-${l.likedAt}`}
                              className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm"
                            >
                              <span className="truncate font-medium">
                                {l.song?.title}
                              </span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {formatDate(l.likedAt)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Song requests
                      </h4>
                      {(detail.songRequests ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No song requests.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.songRequests.map((r: any) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium">
                                  {r.songTitle} — {r.artistName}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(r.createdAt)}
                                </p>
                              </div>
                              <StatusBadge status={r.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="payments" className="space-y-4">
                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Subscriptions
                      </h4>
                      {(detail.subscriptions ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No subscriptions.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.subscriptions.map((s: any) => (
                            <div
                              key={s.id}
                              className="rounded-lg border border-border px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">
                                  {s.plan?.name ?? s.planType}
                                </span>
                                <StatusBadge status={s.status} />
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {formatDate(s.startDate)} →{" "}
                                {formatDate(s.endDate)}
                                {typeof s.plan?.price === "number" &&
                                  ` · ${s.plan.price.toLocaleString()} Ks`}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Payment requests
                      </h4>
                      {(detail.paymentRequests ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No payment requests.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.paymentRequests.map((p: any) => (
                            <div
                              key={p.id}
                              className="rounded-lg border border-border px-3 py-2 text-sm"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">
                                  {p.amount?.toLocaleString()} Ks ·{" "}
                                  {p.paymentMethod?.name ?? p.planType}
                                </span>
                                <StatusBadge status={p.status} />
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                Ref: {p.referenceNumber} ·{" "}
                                {formatDate(p.createdAt)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-semibold">
                        Offline downloads
                      </h4>
                      {(detail.offlineDownloads ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No offline downloads.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.offlineDownloads.map((d: any) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                            >
                              <span className="truncate font-medium">
                                {d.song?.title}
                              </span>
                              <StatusBadge status={d.downloadStatus} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="devices" className="space-y-2">
                    {(detail.deviceLicenses ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No registered devices.
                      </p>
                    ) : (
                      detail.deviceLicenses.map((d: any) => (
                        <div
                          key={d.id}
                          className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5"
                        >
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                            {d.deviceType === "MOBILE" ? (
                              <Smartphone className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Monitor className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {d.deviceName || d.deviceId}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {d.deviceType} · last seen{" "}
                              {formatDateTime(d.lastValidatedAt)}
                            </p>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn(
                              "shrink-0 text-[11px]",
                              d.isValid
                                ? "border-green-500/20 bg-green-500/10 text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                            )}
                          >
                            {d.isValid ? "Valid" : "Revoked"}
                          </Badge>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </div>
              </ScrollArea>
            </Tabs>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

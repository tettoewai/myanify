"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  User,
  Mail,
  Calendar,
  Save,
  Lock,
  Download,
  Crown,
  Bell,
  ShieldCheck,
  LogOut,
  Settings2,
  Eye,
  EyeOff,
  Check,
  TriangleAlert,
  RotateCcw,
  Loader2,
  Music2,
  Disc3,
  ListMusic,
  Megaphone,
  HardDrive,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PasswordStrength } from "@/components/ui/password-strength";
import { SignOutConfirmButton } from "@/components/sign-out-confirm-button";
import { useProfile } from "@/lib/swr";
import { cn } from "@/lib/utils";

type TabId = "profile" | "security" | "vip" | "downloads" | "notifications" | "session";

const ACCOUNT_TABS: { id: TabId; label: string; hint: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", hint: "Name & identity", icon: User },
  { id: "security", label: "Password & security", hint: "Keep account safe", icon: ShieldCheck },
  { id: "session", label: "Session", hint: "Sign out", icon: LogOut },
];

const PLATFORM_TABS: { id: TabId; label: string; hint: string; icon: typeof Crown }[] = [
  { id: "vip", label: "VIP access", hint: "Global kill-switch", icon: Crown },
  { id: "downloads", label: "Offline downloads", hint: "Caps & gating", icon: Download },
  { id: "notifications", label: "Notifications", hint: "Global categories", icon: Bell },
];

const ALL_TABS = [...ACCOUNT_TABS, ...PLATFORM_TABS];

const DOWNLOAD_PRESETS = [50, 100, 200, 500];

function SettingsPageSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6" aria-hidden>
      <div className="flex items-start gap-4">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <Skeleton className="h-72 w-full rounded-xl hidden lg:block" />
        <div className="rounded-xl border border-border p-6 space-y-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </div>
  );
}

function SectionLoading({ label = "Loading settings…" }: { label?: string }) {
  return (
    <div className="space-y-3 py-2" aria-live="polite">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-4 rounded-lg border border-border p-4"
        >
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
          <Skeleton className="h-6 w-11 rounded-full shrink-0" />
        </div>
      ))}
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        {label}
      </p>
    </div>
  );
}

function ToggleRow({
  id,
  icon: Icon,
  iconClassName,
  title,
  description,
  checked,
  onCheckedChange,
  badge,
}: {
  id: string;
  icon: typeof Bell;
  iconClassName?: string;
  title: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-background p-4 transition-colors hover:border-border/80 hover:bg-muted/20">
      <div className="flex items-start gap-3 min-w-0">
        <span
          className={cn(
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            iconClassName ?? "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor={id} className="text-sm font-medium cursor-pointer">
              {title}
            </Label>
            {badge}
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} className="mt-1 shrink-0" />
    </div>
  );
}

function StatusBadge({ on, onLabel = "Enabled", offLabel = "Disabled" }: { on: boolean; onLabel?: string; offLabel?: string }) {
  return (
    <Badge
      variant={on ? "default" : "secondary"}
      className={cn(
        "text-[11px]",
        on
          ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/25 hover:bg-emerald-500/20 dark:text-emerald-400"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span className={cn("mr-1.5 h-1.5 w-1.5 rounded-full", on ? "bg-emerald-500" : "bg-muted-foreground/60")} />
      {on ? onLabel : offLabel}
    </Badge>
  );
}

export default function AdminSettingsPage() {
  const { update: updateSession } = useSession();
  const { profile, isLoading: loading, mutate: mutateProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [name, setName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [dlLoading, setDlLoading] = useState(true);
  const [dlSaving, setDlSaving] = useState(false);
  const [maxSongs, setMaxSongs] = useState("100");
  const [requireVip, setRequireVip] = useState(true);
  const [dlError, setDlError] = useState<string | null>(null);

  const [vipLoading, setVipLoading] = useState(true);
  const [vipSaving, setVipSaving] = useState(false);
  const [vipEnabled, setVipEnabled] = useState(true);

  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifNewSongs, setNotifNewSongs] = useState(true);
  const [notifNewSongsOnlyLiked, setNotifNewSongsOnlyLiked] = useState(true);
  const [notifNewAlbums, setNotifNewAlbums] = useState(true);
  const [notifSongRequestUpdates, setNotifSongRequestUpdates] = useState(true);
  const [notifAnnouncements, setNotifAnnouncements] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setInitialName(profile.name || "");
    }
  }, [profile]);

  useEffect(() => {
    const loadDownloadSettings = async () => {
      try {
        const res = await fetch("/api/admin/download-settings");
        if (res.ok) {
          const data = await res.json();
          setMaxSongs(String(data.settings?.maxSongs ?? 100));
          setRequireVip(data.settings?.requireVip ?? true);
        }
      } catch {
        // Keep defaults on failure.
      } finally {
        setDlLoading(false);
      }
    };
    loadDownloadSettings();
  }, []);

  useEffect(() => {
    const loadVipSettings = async () => {
      try {
        const res = await fetch("/api/admin/vip-settings");
        if (res.ok) {
          const data = await res.json();
          setVipEnabled(data.settings?.enabled ?? true);
        }
      } catch {
        // Keep default (enabled) on failure.
      } finally {
        setVipLoading(false);
      }
    };
    loadVipSettings();
  }, []);

  useEffect(() => {
    const loadNotificationSettings = async () => {
      try {
        const res = await fetch("/api/admin/notification-settings");
        if (res.ok) {
          const data = await res.json();
          setNotifNewSongs(data.settings?.newSongs ?? true);
          setNotifNewSongsOnlyLiked(data.settings?.newSongsOnlyLiked ?? true);
          setNotifNewAlbums(data.settings?.newAlbums ?? true);
          setNotifSongRequestUpdates(data.settings?.songRequestUpdates ?? true);
          setNotifAnnouncements(data.settings?.announcements ?? true);
        }
      } catch {
        // Keep defaults on failure.
      } finally {
        setNotifLoading(false);
      }
    };
    loadNotificationSettings();
  }, []);

  const profileDirty = name.trim() !== initialName.trim();
  const hasPassword = Boolean(profile?.hasPassword);

  const passwordChecks = useMemo(() => {
    return {
      minLength: newPassword.length === 0 || newPassword.length >= 6,
      match: confirmPassword.length === 0 || newPassword === confirmPassword,
      different:
        currentPassword.length === 0 ||
        newPassword.length === 0 ||
        currentPassword !== newPassword,
    };
  }, [currentPassword, newPassword, confirmPassword]);

  const passwordValid =
    newPassword.length >= 6 &&
    newPassword === confirmPassword &&
    (!hasPassword || (currentPassword.length > 0 && currentPassword !== newPassword));

  const notifEnabledCount = [
    notifNewSongs,
    notifNewAlbums,
    notifSongRequestUpdates,
    notifAnnouncements,
  ].filter(Boolean).length;

  const activeTabMeta = ALL_TABS.find((t) => t.id === activeTab);

  const handleSaveVipSettings = async () => {
    setVipSaving(true);
    try {
      const res = await fetch("/api/admin/vip-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: vipEnabled }),
      });
      const data = await res.json();
      if (res.ok) {
        setVipEnabled(data.settings?.enabled ?? vipEnabled);
        toast.success(
          data.settings?.enabled === false
            ? "VIP turned off — everyone now gets VIP features"
            : "VIP settings saved",
        );
      } else {
        toast.error(data.error || "Failed to save VIP settings");
      }
    } catch {
      toast.error("An error occurred while saving VIP settings");
    } finally {
      setVipSaving(false);
    }
  };

  const handleSaveNotificationSettings = async () => {
    setNotifSaving(true);
    try {
      const res = await fetch("/api/admin/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newSongs: notifNewSongs,
          newSongsOnlyLiked: notifNewSongsOnlyLiked,
          newAlbums: notifNewAlbums,
          songRequestUpdates: notifSongRequestUpdates,
          announcements: notifAnnouncements,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNotifNewSongs(data.settings?.newSongs ?? notifNewSongs);
        setNotifNewSongsOnlyLiked(data.settings?.newSongsOnlyLiked ?? notifNewSongsOnlyLiked);
        setNotifNewAlbums(data.settings?.newAlbums ?? notifNewAlbums);
        setNotifSongRequestUpdates(data.settings?.songRequestUpdates ?? notifSongRequestUpdates);
        setNotifAnnouncements(data.settings?.announcements ?? notifAnnouncements);
        toast.success("Notification settings saved");
      } else {
        toast.error(data.error || "Failed to save notification settings");
      }
    } catch {
      toast.error("An error occurred while saving notification settings");
    } finally {
      setNotifSaving(false);
    }
  };

  const handleSaveDownloadSettings = async () => {
    const n = Math.floor(Number(maxSongs));
    if (!Number.isFinite(n) || n < 1 || n > 10000) {
      setDlError("Max songs must be between 1 and 10000");
      toast.error("Max songs must be between 1 and 10000");
      return;
    }
    setDlError(null);
    setDlSaving(true);
    try {
      const res = await fetch("/api/admin/download-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maxSongs: n, requireVip }),
      });
      const data = await res.json();
      if (res.ok) {
        setMaxSongs(String(data.settings?.maxSongs ?? n));
        setRequireVip(data.settings?.requireVip ?? requireVip);
        toast.success("Download settings saved");
      } else {
        toast.error(data.error || "Failed to save download settings");
      }
    } catch {
      toast.error("An error occurred while saving download settings");
    } finally {
      setDlSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    setSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });

      if (response.ok) {
        const updated = await response.json();
        await mutateProfile(updated, false);
        setInitialName(name.trim());
        await updateSession();
        toast.success("Profile updated successfully");
      } else {
        const data = await response.json();
        const errorMsg = data.error || "Failed to update profile";
        toast.error(errorMsg);
      }
    } catch {
      toast.error("An error occurred while updating profile");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (hasPassword && currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }

    setPasswordSaving(true);

    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasPassword ? { currentPassword, newPassword } : { newPassword },
        ),
      });

      if (response.ok) {
        await mutateProfile();
        await updateSession();
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success(
          hasPassword ? "Password updated successfully" : "Password set successfully",
        );
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update password");
      }
    } catch {
      toast.error("An error occurred while updating password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <SettingsPageSkeleton />;
  }

  const initials = (profile?.name || profile?.email || "A").trim().charAt(0).toUpperCase();

  const renderNavGroup = (
    title: string,
    items: typeof ACCOUNT_TABS,
  ) => (
    <div className="space-y-1">
      <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      {items.map((item) => {
        const active = activeTab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveTab(item.id)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
              active
                ? "bg-primary/10 font-medium text-foreground ring-1 ring-inset ring-primary/20"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate">{item.label}</span>
              <span className="block truncate text-xs font-normal text-muted-foreground">
                {item.hint}
              </span>
            </span>
            {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/20">
          <Settings2 className="h-6 w-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Settings
            </h2>
            {profile?.role && (
              <Badge variant="secondary" className="uppercase tracking-wide">
                {profile.role}
              </Badge>
            )}
            {profile?.isPremium && (
              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/20 dark:text-amber-400">
                <Sparkles className="mr-1 h-3 w-3" />
                Premium
              </Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your admin account and platform-wide preferences.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabId)} className="w-full">
        {/* Mobile / tablet nav: horizontal scroll */}
        <TabsList className="mb-4 flex w-full justify-start gap-1 overflow-x-auto p-1 lg:hidden">
          {ALL_TABS.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 data-[state=active]:shadow-sm"
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid items-start gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
          {/* Desktop sidebar nav */}
          <nav
            aria-label="Settings sections"
            className="sticky top-4 hidden space-y-5 rounded-xl border border-border bg-card p-3 shadow-sm lg:block"
          >
            {renderNavGroup("Account", ACCOUNT_TABS)}
            <div className="mx-2 border-t border-border" />
            {renderNavGroup("Platform", PLATFORM_TABS)}
            <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
              Platform settings apply to every user immediately after saving.
            </div>
          </nav>

          {/* Content */}
          <div className="min-w-0">
            {/* Section eyebrow for desktop (mobile already has tab pills) */}
            <div className="mb-3 hidden items-center gap-2 lg:flex">
              {activeTabMeta && (
                <>
                  <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <activeTabMeta.icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{activeTabMeta.label}</span>
                    <span className="mx-1.5 text-border">/</span>
                    {activeTabMeta.hint}
                  </p>
                </>
              )}
            </div>

            <TabsContent value="profile" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Profile</CardTitle>
                  <CardDescription>
                    How your admin identity appears across the dashboard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col gap-5 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
                    <div className="relative mx-auto sm:mx-0">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-primary to-primary/60 text-2xl font-bold text-primary-foreground ring-4 ring-background">
                        {profile?.avatarUrl ? (
                          <img
                            src={profile.avatarUrl}
                            alt={profile.name || "Admin"}
                            className="h-20 w-20 rounded-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <p className="truncate text-lg font-semibold">
                        {profile?.name || "Admin"}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">{profile?.email}</p>
                      <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                        {profile?.role && (
                          <Badge variant="secondary" className="uppercase">
                            {profile.role}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          <Check className="mr-1 h-3 w-3 text-emerald-500" />
                          Verified admin
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="name">Display name</Label>
                        {profileDirty && (
                          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                            Unsaved changes
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="pl-10 pr-12"
                          placeholder="Enter your name"
                          maxLength={60}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs tabular-nums text-muted-foreground">
                          {name.length}/60
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="email"
                          value={profile?.email || ""}
                          disabled
                          className="bg-muted pl-10"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Email is managed by authentication and can&apos;t be changed here.
                      </p>
                    </div>
                  </div>

                  {profile?.createdAt && (
                    <div className="space-y-2 sm:max-w-xs">
                      <Label>Member since</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={new Date(profile.createdAt).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          disabled
                          className="bg-muted pl-10"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    disabled={!profileDirty || saving}
                    onClick={() => setName(initialName)}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={saving || !profileDirty || !name.trim()}
                    className="sm:min-w-36"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    {saving ? "Saving…" : "Save changes"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle>{hasPassword ? "Change password" : "Set a password"}</CardTitle>
                    {hasPassword ? (
                      <Badge variant="secondary">
                        <Lock className="mr-1 h-3 w-3" />
                        Password set
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/25 hover:bg-amber-500/20 dark:text-amber-400">
                        No password yet
                      </Badge>
                    )}
                  </div>
                  <CardDescription>
                    {hasPassword
                      ? "Use a strong, unique password to protect this admin account."
                      : "This account signs in with OAuth. Set a password to enable password sign-in too."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasPassword ? (
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Current password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="currentPassword"
                          type={showCurrent ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="pl-10 pr-10"
                          placeholder="Enter current password"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrent((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          aria-label={showCurrent ? "Hide current password" : "Show current password"}
                        >
                          {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        You haven&apos;t set a password yet. Create one below to enable
                        email + password sign-in for this admin account.
                      </p>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="newPassword"
                          type={showNew ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="pl-10 pr-10"
                          placeholder="Enter new password"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNew((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          aria-label={showNew ? "Hide new password" : "Show new password"}
                        >
                          {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <PasswordStrength password={newPassword} />
                      {!passwordChecks.minLength && (
                        <p className="text-xs text-destructive">Must be at least 6 characters.</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm new password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type={showConfirm ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="pl-10 pr-10"
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirm((v) => !v)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
                          aria-label={showConfirm ? "Hide confirmation" : "Show confirmation"}
                        >
                          {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {!passwordChecks.match && (
                        <p className="text-xs text-destructive">Passwords do not match.</p>
                      )}
                      {hasPassword && !passwordChecks.different && newPassword.length > 0 && (
                        <p className="text-xs text-destructive">
                          New password must differ from the current one.
                        </p>
                      )}
                    </div>
                  </div>

                  <ul className="grid gap-1.5 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground sm:grid-cols-3">
                    <li className="flex items-center gap-1.5">
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          newPassword.length >= 6 ? "text-emerald-500" : "text-muted-foreground/50",
                        )}
                      />
                      6+ characters
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          newPassword && newPassword === confirmPassword
                            ? "text-emerald-500"
                            : "text-muted-foreground/50",
                        )}
                      />
                      Passwords match
                    </li>
                    <li className="flex items-center gap-1.5">
                      <Check
                        className={cn(
                          "h-3.5 w-3.5",
                          !hasPassword || (newPassword && currentPassword !== newPassword)
                            ? "text-emerald-500"
                            : "text-muted-foreground/50",
                        )}
                      />
                      Different from current
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
                  <Button
                    variant="ghost"
                    disabled={passwordSaving || (!currentPassword && !newPassword && !confirmPassword)}
                    onClick={() => {
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                    }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Clear
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={passwordSaving || !passwordValid}
                    className="sm:min-w-40"
                  >
                    {passwordSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {passwordSaving
                      ? "Updating…"
                      : hasPassword
                        ? "Update password"
                        : "Set password"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="vip" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                        <Crown className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <CardTitle>VIP access</CardTitle>
                        <CardDescription>
                          Global kill-switch for the VIP system.
                        </CardDescription>
                      </div>
                    </div>
                    {!vipLoading && (
                      <StatusBadge on={vipEnabled} onLabel="VIP on" offLabel="VIP off" />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    When VIP is turned off, everyone gets VIP features for free —
                    premium songs, no ads, offline downloads and device registration.
                  </p>

                  {vipLoading ? (
                    <SectionLoading label="Loading VIP settings…" />
                  ) : (
                    <>
                      <ToggleRow
                        id="vipEnabled"
                        icon={Crown}
                        iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        title="Enable VIP"
                        description={
                          vipEnabled
                            ? "VIP is ON — only active VIP subscribers get premium features."
                            : "VIP is OFF — everyone gets VIP features for free."
                        }
                        checked={vipEnabled}
                        onCheckedChange={setVipEnabled}
                      />

                      {!vipEnabled && (
                        <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            VIP is currently off. All users can play premium songs, skip
                            ads, and download for offline playback without a subscription.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
                {!vipLoading && (
                  <CardFooter className="flex justify-end border-t pt-6">
                    <Button
                      onClick={handleSaveVipSettings}
                      disabled={vipSaving}
                      className="w-full sm:w-auto sm:min-w-44"
                    >
                      {vipSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {vipSaving ? "Saving…" : "Save VIP settings"}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="downloads" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400">
                        <HardDrive className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <CardTitle>Offline downloads</CardTitle>
                        <CardDescription>
                          Caps and gating for songs, albums and playlists.
                        </CardDescription>
                      </div>
                    </div>
                    {!dlLoading && (
                      <StatusBadge
                        on={!requireVip}
                        onLabel="Open to all"
                        offLabel="VIP only"
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {dlLoading ? (
                    <SectionLoading label="Loading download settings…" />
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="maxSongs">Max songs per user</Label>
                        <Input
                          id="maxSongs"
                          type="number"
                          min={1}
                          max={10000}
                          value={maxSongs}
                          onChange={(e) => {
                            setMaxSongs(e.target.value);
                            setDlError(null);
                          }}
                          placeholder="100"
                          aria-invalid={Boolean(dlError)}
                          aria-describedby="maxSongs-help"
                          className={cn(dlError && "border-destructive focus-visible:ring-destructive")}
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {DOWNLOAD_PRESETS.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setMaxSongs(String(preset));
                                setDlError(null);
                              }}
                              className={cn(
                                "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
                                maxSongs === String(preset)
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground",
                              )}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        {dlError ? (
                          <p className="text-xs text-destructive">{dlError}</p>
                        ) : (
                          <p id="maxSongs-help" className="text-xs text-muted-foreground">
                            Default 100. When lowered, the oldest downloads beyond the new
                            cap expire immediately.
                          </p>
                        )}
                      </div>

                      <ToggleRow
                        id="requireVip"
                        icon={Download}
                        iconClassName="bg-sky-500/15 text-sky-600 dark:text-sky-400"
                        title="Require VIP for downloads"
                        description={
                          requireVip
                            ? "Only active VIP subscribers can download and play offline."
                            : "All signed-in users can download and play offline."
                        }
                        checked={requireVip}
                        onCheckedChange={setRequireVip}
                      />
                    </>
                  )}
                </CardContent>
                {!dlLoading && (
                  <CardFooter className="flex justify-end border-t pt-6">
                    <Button
                      onClick={handleSaveDownloadSettings}
                      disabled={dlSaving}
                      className="w-full sm:w-auto sm:min-w-48"
                    >
                      {dlSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {dlSaving ? "Saving…" : "Save download settings"}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-400">
                        <Bell className="h-4.5 w-4.5" />
                      </span>
                      <div>
                        <CardTitle>Push notifications</CardTitle>
                        <CardDescription>
                          Global categories — disabled types are never sent, regardless of
                          personal preferences.
                        </CardDescription>
                      </div>
                    </div>
                    {!notifLoading && (
                      <Badge variant="secondary" className="tabular-nums">
                        {notifEnabledCount} of 4 on
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {notifLoading ? (
                    <SectionLoading label="Loading notification settings…" />
                  ) : (
                    <>
                      <ToggleRow
                        id="notifNewSongs"
                        icon={Music2}
                        iconClassName="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        title="New songs"
                        description={
                          notifNewSongs
                            ? "Users will be notified about new song releases."
                            : "New song notifications are disabled globally."
                        }
                        checked={notifNewSongs}
                        onCheckedChange={setNotifNewSongs}
                        badge={<StatusBadge on={notifNewSongs} />}
                      />

                      {notifNewSongs && (
                        <div className="ml-4 border-l-2 border-border pl-4 sm:ml-6">
                          <ToggleRow
                            id="notifNewSongsOnlyLiked"
                            icon={Disc3}
                            title="Only liked artists"
                            description={
                              notifNewSongsOnlyLiked
                                ? "Only notify users who liked the artist."
                                : "Notify all users about new songs."
                            }
                            checked={notifNewSongsOnlyLiked}
                            onCheckedChange={setNotifNewSongsOnlyLiked}
                          />
                        </div>
                      )}

                      <ToggleRow
                        id="notifNewAlbums"
                        icon={Disc3}
                        iconClassName="bg-sky-500/15 text-sky-600 dark:text-sky-400"
                        title="New albums"
                        description={
                          notifNewAlbums
                            ? "Users will be notified when new albums are released."
                            : "New album notifications are disabled globally."
                        }
                        checked={notifNewAlbums}
                        onCheckedChange={setNotifNewAlbums}
                        badge={<StatusBadge on={notifNewAlbums} />}
                      />

                      <ToggleRow
                        id="notifSongRequestUpdates"
                        icon={ListMusic}
                        iconClassName="bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        title="Song request updates"
                        description={
                          notifSongRequestUpdates
                            ? "Users will be notified when their requests are approved or rejected."
                            : "Song request updates are disabled globally."
                        }
                        checked={notifSongRequestUpdates}
                        onCheckedChange={setNotifSongRequestUpdates}
                        badge={<StatusBadge on={notifSongRequestUpdates} />}
                      />

                      <ToggleRow
                        id="notifAnnouncements"
                        icon={Megaphone}
                        iconClassName="bg-rose-500/15 text-rose-600 dark:text-rose-400"
                        title="Announcements"
                        description={
                          notifAnnouncements
                            ? "Users will be notified about platform announcements."
                            : "Announcement notifications are disabled globally."
                        }
                        checked={notifAnnouncements}
                        onCheckedChange={setNotifAnnouncements}
                        badge={<StatusBadge on={notifAnnouncements} />}
                      />
                    </>
                  )}
                </CardContent>
                {!notifLoading && (
                  <CardFooter className="flex justify-end border-t pt-6">
                    <Button
                      onClick={handleSaveNotificationSettings}
                      disabled={notifSaving}
                      className="w-full sm:w-auto sm:min-w-52"
                    >
                      {notifSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {notifSaving ? "Saving…" : "Save notification settings"}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="session" className="mt-0 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active session</CardTitle>
                  <CardDescription>
                    You&apos;re signed in as {profile?.email || "this admin account"}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row sm:items-center">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <User className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{profile?.name || "Admin"}</p>
                      <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Current session
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Signing out ends this session. You&apos;ll need to sign in again.
                  </p>
                  <SignOutConfirmButton variant="destructive" className="w-full sm:w-auto" />
                </CardFooter>
              </Card>
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  );
}

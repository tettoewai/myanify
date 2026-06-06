"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  User,
  Mail,
  Calendar,
  Save,
  Lock,
  Upload,
  LogIn,
  Crown,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignOutConfirmButton } from "@/components/sign-out-confirm-button";
import { useProfile } from "@/lib/swr";
import { getLoginUrl } from "@/lib/require-login";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";


// ------------------------------
//  Header Component
// ------------------------------
function SettingsPageHeader() {
  return (
    <div className="space-y-1">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
        Settings
      </h1>
      <p className="text-muted-foreground">
        Manage your account and preferences
      </p>
    </div>
  );
}

// ------------------------------
//  Loading Skeleton
// ------------------------------
function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <Skeleton className="h-10 w-48 rounded-lg" />
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Skeleton className="w-24 h-24 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-full sm:w-32" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}

// ------------------------------
//  Sign In Prompt
// ------------------------------
function SettingsSignInPrompt() {
  const loginUrl = getLoginUrl("/settings");

  return (
    <Card className="max-w-lg mx-auto mt-4 border-border/80 shadow-sm">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
        <CardTitle className="text-xl">Sign in to manage settings</CardTitle>
        <CardDescription className="text-balance">
          Update your profile, set a password, and manage your account after
          signing in.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button asChild className="sm:min-w-[140px]">
          <Link href={loginUrl}>
            <LogIn className="w-4 h-4 mr-2" />
            Sign in
          </Link>
        </Button>
        <Button asChild variant="outline" className="sm:min-w-[140px]">
          <Link href="/home">Browse music</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ------------------------------
//  Main Settings Page (no tabs)
// ------------------------------
export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const isAuthenticated = status === "authenticated";
  const {
    profile,
    isLoading,
    isError,
    mutate: mutateProfile,
  } = useProfile({
    enabled: isAuthenticated,
  });

  // Profile form states
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  // Password form states
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAvatarUrl(profile.avatarUrl || "");
    }
  }, [profile]);

  const displayName = profile?.name || session?.user?.name || "User";
  const displayEmail = profile?.email || session?.user?.email || "";
  const displayAvatar = profile?.avatarUrl || null;

  // Profile save handler
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, avatarUrl }),
      });

      if (response.ok) {
        const updated = await response.json();
        await mutateProfile(updated, false);
        await updateSession();
        toast.success("Profile updated successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update profile");
      }
    } catch {
      toast.error("An error occurred while updating profile");
    } finally {
      setSaving(false);
    }
  };

  // Password change handler
  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (profile?.hasPassword && currentPassword === newPassword) {
      toast.error("New password must be different from current password");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          isInitialSetup: !profile?.hasPassword,
        }),
      });

      if (response.ok) {
        toast.success(
          profile?.hasPassword
            ? "Password updated successfully"
            : "Password set successfully",
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        await mutateProfile();
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

  // Shell wrapper with consistent spacing and full height
  const pageShell = (children: React.ReactNode) => (
    <div className="min-h-full p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-8 pb-32">
      <SettingsPageHeader />
      {children}
    </div>
  );

  // Loading states
  if (status === "loading" || isLoading) {
    return pageShell(<SettingsLoadingSkeleton />);
  }

  if (status === "unauthenticated") {
    return pageShell(<SettingsSignInPrompt />);
  }

  if (isError) {
    return pageShell(
      <Card className="border-destructive/30 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <p className="font-medium">Could not load your profile</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check your connection and try again.
            </p>
          </div>
          <Button variant="outline" onClick={() => mutateProfile()}>
            Retry
          </Button>
        </CardContent>
      </Card>,
    );
  }

  // Main authenticated view – no tabs, just sections
  return pageShell(
    <div className="space-y-8 pb-32">
      {/* Profile Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Update your personal information and avatar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar & basic info */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="relative shrink-0 mx-auto sm:mx-0">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground overflow-hidden ring-2 ring-border shadow-sm">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-12 h-12" />
                )}
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left min-w-0">
              <h2 className="text-xl font-semibold truncate">{displayName}</h2>
              <p className="text-muted-foreground truncate">{displayEmail}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                {profile?.isPremium ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    <Crown className="w-3.5 h-3.5" />
                    Premium
                  </span>
                ) : (
                  <Button asChild variant="outline" size="sm" className="gap-1">
                    <Link href="/premium">
                      <Crown className="w-3.5 h-3.5" />
                      Upgrade to Premium
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Display name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="pl-10"
                  placeholder="Enter your name"
                  autoComplete="name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={displayEmail}
                  disabled
                  className="pl-10 bg-muted/50 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Email is managed by your sign-in provider and cannot be changed
                here.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatarUrl">Avatar URL</Label>
              <div className="relative">
                <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="avatarUrl"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="pl-10"
                  placeholder="https://example.com/avatar.jpg"
                  type="url"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Paste a link to an image. Leave empty to use your default
                avatar.
              </p>
            </div>

            {profile?.createdAt && (
              <div className="space-y-2">
                <Label>Member since</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={new Date(profile.createdAt).toLocaleDateString(
                      undefined,
                      {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      },
                    )}
                    disabled
                    className="pl-10 bg-muted/50 cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>

          <Button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full sm:w-auto gap-2"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </Card>

      {/* Password Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>
            {profile?.hasPassword ? "Change password" : "Set a password"}
          </CardTitle>
          <CardDescription>
            {profile?.hasPassword
              ? "Use a strong password you do not use elsewhere."
              : "Add a password so you can sign in with email as well as Google."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.hasPassword && (
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="pl-10 pr-10"
                  placeholder="Enter current password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff size={16} />
                  ) : (
                    <Eye size={16} />
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              {profile?.hasPassword ? "New password" : "Password"}
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="newPassword"
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="pl-10 pr-10"
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={cn(
                  "pl-10 pr-10",
                  confirmPassword &&
                    newPassword !== confirmPassword &&
                    "border-destructive focus-visible:ring-destructive/30",
                )}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                Passwords do not match
              </p>
            )}
            {newPassword && newPassword.length < 6 && (
              <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                Password must be at least 6 characters
              </p>
            )}
          </div>

          <Button
            onClick={handleChangePassword}
            disabled={
              passwordSaving ||
              (profile?.hasPassword && !currentPassword) ||
              !newPassword ||
              !confirmPassword ||
              newPassword !== confirmPassword ||
              newPassword.length < 6
            }
            className="w-full sm:w-auto gap-2"
          >
            {passwordSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {passwordSaving
              ? "Processing…"
              : profile?.hasPassword
                ? "Update password"
                : "Set password"}
          </Button>
        </CardContent>
      </Card>

      {/* Account Section */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Sign out on this device. You can sign back in anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutConfirmButton
            variant="outline"
            className="w-full sm:w-auto border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
          />
        </CardContent>
      </Card>
    </div>,
  );
}

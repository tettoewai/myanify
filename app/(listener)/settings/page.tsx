"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { toast } from "sonner";
import {
  User,
  Mail,
  Calendar,
  Save,
  Lock,
  LogIn,
  Crown,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  LogOut,
  RefreshCw,
  Music,
  ChevronRight,
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
import {
  ApiError,
  RateLimitError,
  handleFetchError,
  handleMutationResponse,
} from "@/lib/api-client";
import { useProfile } from "@/lib/swr";
import { getLoginUrl } from "@/lib/require-login";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

// ------------------------------
//  Password strength utils
// ------------------------------
function getPasswordStrength(pwd: string): {
  score: number;
  label: string;
  color: string;
} {
  if (!pwd) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: "Weak", color: "bg-destructive" };
  if (score <= 2) return { score, label: "Fair", color: "bg-amber-500" };
  if (score <= 3) return { score, label: "Good", color: "bg-yellow-400" };
  return { score, label: "Strong", color: "bg-emerald-500" };
}

// ------------------------------
//  Loading Skeleton
// ------------------------------
function SettingsLoadingSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Skeleton className="w-20 h-20 rounded-full shrink-0 mx-auto sm:mx-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-full max-w-md" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full rounded-lg" />
        ))}
        <Skeleton className="h-10 w-36 rounded-lg" />
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
    <Card className="max-w-md mx-auto mt-4 border-border/60 shadow-sm">
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
        <Button
          asChild
          className="sm:min-w-[140px] rounded-full bg-primary hover:bg-primary/90"
        >
          <Link href={loginUrl}>
            <LogIn className="w-4 h-4 mr-2" />
            Sign in
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="sm:min-w-[140px] rounded-full"
        >
          <Link href="/home">Browse music</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

// ------------------------------
//  Password field with toggle
// ------------------------------
function PasswordInput({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  className,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn("pl-10 pr-10", className)}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

// ------------------------------
//  Main Settings Page
// ------------------------------
export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const isAuthenticated = status === "authenticated";
  const {
    profile,
    isLoading,
    isError,
    mutate: mutateProfile,
  } = useProfile({ enabled: isAuthenticated });

  // Profile form
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");

  // Dirty tracking
  const pristineRef = useRef({ name: "" });
  const isProfileDirty = name !== pristineRef.current.name;

  // Password form
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (profile) {
      const n = profile.name || "";
      setName(n);
      pristineRef.current = { name: n };
    }
  }, [profile]);

  const displayName = profile?.name || session?.user?.name || "User";
  const displayEmail = profile?.email || session?.user?.email || "";
  const displayAvatar = profile?.avatarUrl || "";

  const strength = getPasswordStrength(newPassword);
  const passwordsMatch =
    confirmPassword.length > 0 && newPassword === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const updated = await handleMutationResponse(response, {
        successMessage: "Profile updated successfully",
        fallbackError: "Failed to update profile",
      });
      await mutateProfile(updated, false);
      await updateSession();
      pristineRef.current = { name };
    } catch (error) {
      if (!(error instanceof ApiError) && !(error instanceof RateLimitError)) {
        handleFetchError(error, "An error occurred while updating profile");
      }
    } finally {
      setSaving(false);
    }
  };

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
      await handleMutationResponse(response, {
        successMessage: profile?.hasPassword
          ? "Password updated successfully"
          : "Password set successfully",
        fallbackError: "Failed to update password",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await mutateProfile();
    } catch (error) {
      if (!(error instanceof ApiError) && !(error instanceof RateLimitError)) {
        handleFetchError(error, "An error occurred while updating password");
      }
    } finally {
      setPasswordSaving(false);
    }
  };

  const pageShell = (children: React.ReactNode) => (
    <div className="min-h-full p-4 md:p-6 lg:p-8 pb-32">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Page header */}
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-muted-foreground text-sm">
            Manage your account and preferences
          </p>
        </div>
        {children}
      </div>
    </div>
  );

  if (status === "loading" || isLoading)
    return pageShell(<SettingsLoadingSkeleton />);
  if (status === "unauthenticated") return pageShell(<SettingsSignInPrompt />);

  if (isError) {
    return pageShell(
      <Card className="border-destructive/30 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <AlertCircle className="h-10 w-10 text-destructive" />
          <div>
            <p className="font-semibold">Could not load your profile</p>
            <p className="text-sm text-muted-foreground mt-1">
              Check your connection and try again.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => mutateProfile()}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Retry
          </Button>
        </CardContent>
      </Card>,
    );
  }

  return pageShell(
    <div className="space-y-6 pb-32">
      {/* ── Profile ── */}
      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Profile</CardTitle>
              <CardDescription className="text-xs">
                Update your display name
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar row */}
          <div className="flex items-center gap-5">
            {/* Avatar display */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground overflow-hidden ring-2 ring-border shadow-md">
                {displayAvatar ? (
                  <img
                    src={displayAvatar}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-9 h-9" />
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-lg truncate leading-tight">
                {displayName}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {displayEmail}
              </p>
              <div className="mt-2">
                {profile?.isPremium ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium">
                    <Crown className="w-3 h-3" /> Premium
                  </span>
                ) : (
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="rounded-full h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10 hover:text-primary"
                  >
                    <Link href="/premium">
                      <Crown className="w-3 h-3" /> Upgrade to Premium
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">
                Display name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  value={displayEmail}
                  disabled
                  className="pl-10 bg-muted/40 cursor-not-allowed text-muted-foreground"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Managed by your sign-in provider — cannot be changed here.
              </p>
            </div>

            {profile?.createdAt && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Member since</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
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
                    className="pl-10 bg-muted/40 cursor-not-allowed text-muted-foreground"
                    readOnly
                  />
                </div>
              </div>
            )}
          </div>

          {/* Save row */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleSaveProfile}
              disabled={saving || !isProfileDirty}
              className="gap-2 rounded-full"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {isProfileDirty && !saving && (
              <span className="text-xs text-amber-500 flex items-center gap-1 font-medium">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Password ── */}
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">
                {profile?.hasPassword ? "Change password" : "Set a password"}
              </CardTitle>
              <CardDescription className="text-xs">
                {profile?.hasPassword
                  ? "Use a strong password you don't use elsewhere."
                  : "Add a password to sign in with email alongside Google."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile?.hasPassword && (
            <div className="space-y-1.5">
              <Label htmlFor="currentPassword" className="text-sm font-medium">
                Current password
              </Label>
              <PasswordInput
                id="currentPassword"
                value={currentPassword}
                onChange={setCurrentPassword}
                placeholder="Enter current password"
                autoComplete="current-password"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="newPassword" className="text-sm font-medium">
              {profile?.hasPassword ? "New password" : "Password"}
            </Label>
            <PasswordInput
              id="newPassword"
              value={newPassword}
              onChange={setNewPassword}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
            {/* Strength bar */}
            {newPassword.length > 0 && (
              <div className="space-y-1 pt-0.5">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className={cn(
                        "h-1 flex-1 rounded-full transition-all duration-300",
                        strength.score >= n ? strength.color : "bg-border",
                      )}
                    />
                  ))}
                </div>
                <p
                  className={cn(
                    "text-xs font-medium",
                    strength.score <= 1 && "text-destructive",
                    strength.score === 2 && "text-amber-500",
                    strength.score === 3 && "text-yellow-500",
                    strength.score >= 4 && "text-emerald-500",
                  )}
                >
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </Label>
            <PasswordInput
              id="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Re-enter your password"
              autoComplete="new-password"
              className={cn(
                passwordsMismatch &&
                  "border-destructive focus-visible:ring-destructive/30",
                passwordsMatch &&
                  "border-emerald-500/60 focus-visible:ring-emerald-500/20",
              )}
            />
            {passwordsMismatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Passwords do not match
              </p>
            )}
            {passwordsMatch && (
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Passwords match
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
              passwordsMismatch ||
              newPassword.length < 6
            }
            className="gap-2 rounded-full"
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

      {/* ── Premium upgrade banner (non-premium only) ── */}
      {/* {!profile?.isPremium && (
        <div className="rounded-xl bg-linear-to-r from-primary/20 via-primary/10 to-card border border-primary/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Crown className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground">
              Unlock Myanify Premium
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Ad-free listening, offline mode, and exclusive premium tracks.
            </p>
          </div>
          <Button
            asChild
            className="shrink-0 rounded-full bg-primary hover:bg-primary/90 shadow-md shadow-primary/20"
          >
            <Link href="/premium">
              <Crown className="w-4 h-4 mr-2" /> Upgrade now
            </Link>
          </Button>
        </div>
      )} */}

      {/* ── Song Requests ── */}
      <Link href="/request-song" className="block">
        <Card className="border-border/60 shadow-sm hover:bg-accent/50 transition-colors cursor-pointer">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Music className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Song Requests</p>
                <p className="text-xs text-muted-foreground">
                  Request a song you would like to see on Myanify
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </Link>

      {/* ── Danger zone ── */}
      <Card className="border-destructive/20 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
              <LogOut className="h-4 w-4 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-base text-destructive">
                Sign out
              </CardTitle>
              <CardDescription className="text-xs">
                Sign out on this device. You can sign back in anytime.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SignOutConfirmButton
            variant="outline"
            className="rounded-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive gap-2"
          />
        </CardContent>
      </Card>
    </div>,
  );
}

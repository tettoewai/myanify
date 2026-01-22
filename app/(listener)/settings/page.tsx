"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Mail, Calendar, Save, Lock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignOutConfirmButton } from "@/components/sign-out-confirm-button";
import { useProfile } from "@/lib/swr";

export const dynamic = "force-dynamic";

interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  isPremium: boolean;
  createdAt: string;
  hasPassword: boolean;
}

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const { profile, isLoading, mutate: mutateProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");


  // Update form fields when profile data loads
  React.useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setAvatarUrl(profile.avatarUrl || "");
    }
  }, [profile]);

  // Show loading while session is loading
  if (status === "loading") {
    return <div className="text-center py-12">Loading...</div>;
  }

  // Redirect if not authenticated
  if (status === "unauthenticated") {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Please sign in to access settings</p>
        <a href="/login" className="text-primary hover:underline">
          Go to Login
        </a>
      </div>
    );
  }

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
        mutateProfile(updated, false); // Update cache without revalidation
        await updateSession();
        toast.success("Profile updated successfully");
      } else {
        const data = await response.json();
        const errorMsg = data.error || "Failed to update profile";
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = "An error occurred while updating profile";
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      const errorMsg = "New passwords do not match";
      toast.error(errorMsg);
      return;
    }

    if (currentPassword === newPassword) {
      toast.error("New password must be different from current password");
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
            : "Password set successfully"
        );
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        mutateProfile(); // Refresh profile to update hasPassword state
      } else {
        const data = await response.json();
        const errorMsg = data.error || "Failed to update password";
        toast.error(errorMsg);
      }
    } catch (error) {
      const errorMsg = "An error occurred while updating password";
      toast.error(errorMsg);
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 mb-24">
      <div className="mt-10">
        <h2 className="text-3xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">
            {profile?.hasPassword ? "Password" : "Set Password"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name || "User"}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {profile?.name || "User"}
                </h3>
                <p className="text-muted-foreground">{profile?.email}</p>
                {profile?.isPremium && (
                  <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                    Premium
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={profile?.email || ""}
                    disabled
                    className="pl-10 bg-muted"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
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
                  />
                </div>
              </div>

              {profile?.createdAt && (
                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={new Date(profile.createdAt).toLocaleDateString()}
                      disabled
                      className="pl-10 bg-muted"
                    />
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="w-full"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="password" className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h3 className="text-xl font-semibold">
              {profile?.hasPassword ? "Change Password" : "Set Password"}
            </h3>

            {!profile?.hasPassword && (
              <p className="text-sm text-muted-foreground">
                Set a password to enable signing in with your email address
                instead of just Google.
              </p>
            )}

            <div className="space-y-4">
              {profile?.hasPassword && (
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="pl-10"
                      placeholder="Enter current password"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Enter new password"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 6 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={
                passwordSaving ||
                (profile?.hasPassword && !currentPassword) ||
                !newPassword ||
                !confirmPassword
              }
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              {passwordSaving
                ? "Processing..."
                : profile?.hasPassword
                  ? "Update Password"
                  : "Set Password"}
            </Button>
          </div>
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h3 className="text-xl font-semibold">Account Actions</h3>
            <p className="text-muted-foreground">
              Sign out of your account. You will need to sign in again to access
              your account.
            </p>
            <SignOutConfirmButton fullWidth />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

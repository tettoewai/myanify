"use client";

import { useEffect, useState } from "react";
import { AdminFormPageSkeleton } from "@/components/loading-skeletons";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { User, Mail, Calendar, Save, Lock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SignOutConfirmButton } from "@/components/sign-out-confirm-button";
import { useProfile } from "@/lib/swr";


interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: string;
  isPremium: boolean;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const { profile, isLoading: loading, mutate: mutateProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [name, setName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [dlLoading, setDlLoading] = useState(true);
  const [dlSaving, setDlSaving] = useState(false);
  const [maxSongs, setMaxSongs] = useState("100");
  const [requireVip, setRequireVip] = useState(true);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
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

  const handleSaveDownloadSettings = async () => {
    const n = Math.floor(Number(maxSongs));
    if (!Number.isFinite(n) || n < 1 || n > 10000) {
      toast.error("Max songs must be between 1 and 10000");
      return;
    }
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
    setSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (response.ok) {
        const updated = await response.json();
        await mutateProfile(updated, false);
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
      toast.error("New passwords do not match");
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
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (response.ok) {
        await mutateProfile();
        await updateSession();
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        toast.success("Password updated successfully");
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to update password");
      }
    } catch (error) {
      toast.error("An error occurred while updating password");
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) {
    return <AdminFormPageSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground mt-1">
          Manage your admin account settings
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="downloads">Downloads</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground text-2xl font-bold">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.name || "Admin"}
                      className="w-24 h-24 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-12 h-12" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">
                  {profile?.name || "Admin"}
                </h3>
                <p className="text-muted-foreground">{profile?.email}</p>
                <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                  {profile?.role}
                </span>
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
            <h3 className="text-xl font-semibold">Change Password</h3>

            <div className="space-y-4">

              {profile.hasPassword ?
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
                </div> :
                <div>
                  <span>You haven't set a password yet. Please set a password.</span>
                </div>}

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
                !newPassword ||
                !confirmPassword
              }
              className="w-full"
            >
              <Lock className="w-4 h-4 mr-2" />
              {passwordSaving ? "Updating..." : "Update Password"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="account" className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <h3 className="text-xl font-semibold">Account Actions</h3>
            <p className="text-muted-foreground">
              Sign out of your account. You will need to sign in again to access
              your account.
            </p>
            <SignOutConfirmButton fullWidth />
          </div>
        </TabsContent>

        <TabsContent value="downloads" className="space-y-6">
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <div>
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Download className="w-5 h-5" />
                Offline Downloads
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Control who can download songs for offline playback and how many
                songs each user may keep. Applies to songs, albums and
                playlists.
              </p>
            </div>

            {dlLoading ? (
              <p className="text-muted-foreground text-sm">Loading…</p>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="maxSongs">Max songs per user (default 100)</Label>
                  <Input
                    id="maxSongs"
                    type="number"
                    min={1}
                    max={10000}
                    value={maxSongs}
                    onChange={(e) => setMaxSongs(e.target.value)}
                    placeholder="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    When lowered, the oldest downloads beyond the new cap are
                    expired immediately.
                  </p>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
                  <div className="space-y-1">
                    <Label htmlFor="requireVip">Require VIP for downloads</Label>
                    <p className="text-xs text-muted-foreground">
                      {requireVip
                        ? "Only active VIP subscribers can download and play offline."
                        : "All signed-in users can download and play offline."}
                    </p>
                  </div>
                  <Switch
                    id="requireVip"
                    checked={requireVip}
                    onCheckedChange={setRequireVip}
                  />
                </div>

                <Button
                  onClick={handleSaveDownloadSettings}
                  disabled={dlSaving}
                  className="w-full"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {dlSaving ? "Saving..." : "Save Download Settings"}
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

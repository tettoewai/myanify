"use client";

import { useMemo, useState, useEffect } from "react";
import { Crown, Search } from "lucide-react";
import { toast } from "sonner";
import { useAdminUsers } from "@/lib/swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const dynamic = "force-dynamic";

interface AdminUserStats {
  playlists: number;
  likedSongs: number;
  likedArtists: number;
  playHistory: number;
}

interface AdminUserSubscription {
  status: string;
  planType: string;
  endDate: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "LISTENER";
  isPremium: boolean;
  createdAt: string;
  stats: AdminUserStats;
  subscription: AdminUserSubscription | null;
}

interface UsersResponse {
  data: AdminUser[];
}

export default function AdminUsersPage() {
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const [roleFilter, setRoleFilter] = useState<"all" | "ADMIN" | "LISTENER">(
    "all"
  );
  const [vipFilter, setVipFilter] = useState<"all" | "vip" | "non-vip">("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleDialogUser, setRoleDialogUser] = useState<AdminUser | null>(null);
  const [roleDialogTargetRole, setRoleDialogTargetRole] = useState<
    "ADMIN" | "LISTENER" | null
  >(null);
  const [vipDialogOpen, setVipDialogOpen] = useState(false);
  const [vipDialogUser, setVipDialogUser] = useState<AdminUser | null>(null);
  const [vipDialogTargetPremium, setVipDialogTargetPremium] = useState<
    boolean | null
  >(null);
  const [adminPassword, setAdminPassword] = useState("");

  const {
    users,
    isError: error,
    isLoading,
    mutate: mutateUsers,
  } = useAdminUsers({
    search: searchQuery,
    role: roleFilter,
    vip: vipFilter,
  });

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0
      ),
    [users]
  );

  const updateUser = async (
    id: string,
    updates: {
      isPremium?: boolean;
      role?: "ADMIN" | "LISTENER";
      adminPassword?: string;
    }
  ) => {
    try {
      setUpdatingUserId(id);

      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        toast.error(payload?.error || "Failed to update user");
        return;
      }

      toast.success("User updated successfully");
      await mutateUsers();
    } catch (e) {
      console.error("Error updating user:", e);
      toast.error("Failed to update user");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const toggleVip = async (user: AdminUser) => {
    setVipDialogUser(user);
    setVipDialogTargetPremium(!user.isPremium);
    setAdminPassword("");
    setVipDialogOpen(true);
  };

  const changeRole = async (user: AdminUser, role: "ADMIN" | "LISTENER") => {
    if (user.role === role) {
      return;
    }
    setRoleDialogUser(user);
    setRoleDialogTargetRole(role);
    setAdminPassword("");
    setRoleDialogOpen(true);
  };

  const confirmRoleChange = async () => {
    if (!roleDialogUser || !roleDialogTargetRole) {
      return;
    }

    if (!adminPassword.trim()) {
      toast.error("Please enter your admin password");
      return;
    }

    await updateUser(roleDialogUser.id, {
      role: roleDialogTargetRole,
      adminPassword,
    });

    setRoleDialogOpen(false);
    setRoleDialogUser(null);
    setRoleDialogTargetRole(null);
    setAdminPassword("");
  };

  const confirmVipChange = async () => {
    if (!vipDialogUser || vipDialogTargetPremium === null) {
      return;
    }

    if (!adminPassword.trim()) {
      toast.error("Please enter your admin password");
      return;
    }

    await updateUser(vipDialogUser.id, {
      isPremium: vipDialogTargetPremium,
      adminPassword,
    });

    setVipDialogOpen(false);
    setVipDialogUser(null);
    setVipDialogTargetPremium(null);
    setAdminPassword("");
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Users</h2>
            <p className="text-muted-foreground mt-1">
              Manage users, roles, and VIP status
            </p>
          </div>
        </div>
        <div className="bg-card rounded-lg border border-border h-[400px] flex items-center justify-center">
          <div className="text-muted-foreground">Loading users...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load users
      </div>
    );
  }

  if (isLoading) {
    return <div className="text-center py-12">Loading users...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Users</h2>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and VIP status
          </p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3">
          <div className="w-32">
            <Select
              value={roleFilter}
              onValueChange={(value) =>
                setRoleFilter(value as "all" | "ADMIN" | "LISTENER")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="LISTENER">Listener</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-32">
            <Select
              value={vipFilter}
              onValueChange={(value) =>
                setVipFilter(value as "all" | "vip" | "non-vip")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="VIP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="vip">VIP only</SelectItem>
                <SelectItem value="non-vip">Non-VIP</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {sortedUsers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No users found
          </div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  VIP
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Usage
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Subscription
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Joined
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => {
                const isUpdating = updatingUserId === user.id;
                const joinedDate = new Date(user.createdAt).toLocaleDateString();
                const subscriptionLabel = user.subscription
                  ? `${user.subscription.planType} (${user.subscription.status})`
                  : user.isPremium
                    ? "VIP access"
                    : "Free";

                const subscriptionEndDate =
                  user.subscription?.endDate &&
                  new Date(user.subscription.endDate).toLocaleDateString();

                return (
                  <tr
                    key={user.id}
                    className="border-t border-border hover:bg-muted/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary uppercase">
                          {user.name?.charAt(0) ||
                            user.email.charAt(0) ||
                            "U"}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">
                            {user.name || "Unnamed user"}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-32">
                        <Select
                          value={user.role}
                          onValueChange={(value) =>
                            changeRole(
                              user,
                              value as "ADMIN" | "LISTENER"
                            )
                          }
                          disabled={isUpdating}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ADMIN">Admin</SelectItem>
                            <SelectItem value="LISTENER">Listener</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.isPremium
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-gray-500/10 text-gray-500"
                            }`}
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          {user.isPremium ? "VIP" : "Free"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>
                          Playlists:{" "}
                          <span className="font-medium text-foreground">
                            {user.stats.playlists}
                          </span>
                        </div>
                        <div>
                          Liked songs:{" "}
                          <span className="font-medium text-foreground">
                            {user.stats.likedSongs}
                          </span>
                        </div>
                        <div>
                          Liked artists:{" "}
                          <span className="font-medium text-foreground">
                            {user.stats.likedArtists}
                          </span>
                        </div>
                        <div>
                          Plays:{" "}
                          <span className="font-medium text-foreground">
                            {user.stats.playHistory}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className="font-medium text-foreground">
                          {subscriptionLabel}
                        </div>
                        {subscriptionEndDate && (
                          <div>Ends {subscriptionEndDate}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {joinedDate}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleVip(user)}
                        disabled={isUpdating}
                      >
                        {user.isPremium ? "Remove VIP" : "Make VIP"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <Dialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setRoleDialogOpen(false);
            setRoleDialogUser(null);
            setRoleDialogTargetRole(null);
            setAdminPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm role change</DialogTitle>
            <DialogDescription>
              {roleDialogUser && roleDialogTargetRole ? (
                <>
                  Change{" "}
                  <span className="font-medium text-foreground">
                    {roleDialogUser.email}
                  </span>{" "}
                  role from{" "}
                  <span className="font-medium text-foreground">
                    {roleDialogUser.role === "ADMIN" ? "Admin" : "Listener"}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium text-foreground">
                    {roleDialogTargetRole === "ADMIN" ? "Admin" : "Listener"}
                  </span>
                  .
                </>
              ) : (
                "Confirm changing user role."
              )}
              {" This action requires your admin password."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">
                Admin password
              </div>
              <Input
                type="password"
                placeholder="Enter your password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRoleDialogOpen(false);
                setRoleDialogUser(null);
                setRoleDialogTargetRole(null);
                setAdminPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRoleChange}
              disabled={
                Boolean(!adminPassword.trim() ||
                  (roleDialogUser &&
                    updatingUserId !== null &&
                    updatingUserId === roleDialogUser.id))
              }
            >
              {roleDialogUser &&
                updatingUserId !== null &&
                updatingUserId === roleDialogUser.id
                ? "Updating..."
                : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={vipDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setVipDialogOpen(false);
            setVipDialogUser(null);
            setVipDialogTargetPremium(null);
            setAdminPassword("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm VIP status change</DialogTitle>
            <DialogDescription>
              {vipDialogUser && vipDialogTargetPremium !== null ? (
                <>
                  {vipDialogTargetPremium ? "Make " : "Remove "} VIP for{" "}
                  <span className="font-medium text-foreground">
                    {vipDialogUser.email}
                  </span>
                  .
                </>
              ) : (
                "Confirm changing VIP status."
              )}
              {" This action requires your admin password."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">
                Admin password
              </div>
              <Input
                type="password"
                placeholder="Enter your password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVipDialogOpen(false);
                setVipDialogUser(null);
                setVipDialogTargetPremium(null);
                setAdminPassword("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmVipChange}
              disabled={
                Boolean(!adminPassword.trim() ||
                  (vipDialogUser &&
                    updatingUserId !== null &&
                    updatingUserId === vipDialogUser.id))
              }
            >
              {vipDialogUser &&
                updatingUserId !== null &&
                updatingUserId === vipDialogUser.id
                ? "Updating..."
                : "Confirm"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

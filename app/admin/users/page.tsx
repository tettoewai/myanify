"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Crown,
  Search,
  Users,
  UserPlus,
  Clock,
  Download,
  Eye,
  FilterX,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AdminListPageSkeleton } from "@/components/loading-skeletons";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { UserDetailDrawer } from "@/components/admin/user-detail-drawer";
import {
  useAdminUsers,
  useAdminUserStats,
} from "@/lib/swr";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useDebounce } from "@/hooks/use-debounce";
import { cn, getInitials } from "@/lib/utils";

interface AdminUserStats {
  playlists: number;
  likedSongs: number;
  likedArtists: number;
  playHistory: number;
  paymentRequests: number;
  songRequests: number;
  offlineDownloads: number;
  deviceLicenses: number;
}

interface AdminUserSubscription {
  status: string;
  planType: string;
  startDate: string | null;
  endDate: string | null;
}

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  role: "ADMIN" | "LISTENER";
  isPremium: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  providers: string[];
  lastActiveAt: string | null;
  stats: AdminUserStats;
  subscription: AdminUserSubscription | null;
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

function timeAgo(value: string | null | undefined) {
  if (!value) return "Never";
  const d = new Date(value).getTime();
  if (Number.isNaN(d)) return "Never";
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function exportCsv(users: AdminUser[]) {
  const header = [
    "id",
    "email",
    "name",
    "role",
    "isPremium",
    "verified",
    "providers",
    "plays",
    "playlists",
    "likedSongs",
    "subscription",
    "lastActive",
    "joined",
  ];
  const rows = users.map((u) =>
    [
      u.id,
      u.email,
      u.name ?? "",
      u.role,
      u.isPremium ? "VIP" : "Free",
      u.emailVerified ? "yes" : "no",
      (u.providers ?? []).join("|"),
      u.stats.playHistory,
      u.stats.playlists,
      u.stats.likedSongs,
      u.subscription
        ? `${u.subscription.planType}/${u.subscription.status}`
        : "none",
      u.lastActiveAt ?? "",
      u.createdAt,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `myanify-users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "mostActive", label: "Most active" },
  { value: "mostLiked", label: "Most likes" },
  { value: "name", label: "Name A–Z" },
  { value: "email", label: "Email A–Z" },
];

const VALID_ROLES = ["all", "ADMIN", "LISTENER"] as const;
const VALID_VIP = ["all", "vip", "non-vip"] as const;
const VALID_SUBSCRIPTION = ["all", "active", "expired", "cancelled", "none"];
const VALID_JOINED = ["all", "7d", "30d"];
const VALID_VERIFIED = ["all", "verified", "unverified"];
const DEFAULT_SORT = "newest";

function pickParam(
  value: string | null,
  valid: readonly string[],
  fallback: string
) {
  return value && valid.includes(value) ? value : fallback;
}

function parsePageParam(value: string | null) {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default function AdminUsersPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") ?? ""
  );
  const debouncedSearchQuery = useDebounce(searchQuery);

  const [roleFilter, setRoleFilter] = useState<"all" | "ADMIN" | "LISTENER">(
    () =>
      pickParam(searchParams.get("role"), VALID_ROLES, "all") as
        | "all"
        | "ADMIN"
        | "LISTENER"
  );
  const [vipFilter, setVipFilter] = useState<"all" | "vip" | "non-vip">(
    () =>
      pickParam(searchParams.get("vip"), VALID_VIP, "all") as
        | "all"
        | "vip"
        | "non-vip"
  );
  const [subscriptionFilter, setSubscriptionFilter] = useState(() =>
    pickParam(searchParams.get("subscription"), VALID_SUBSCRIPTION, "all")
  );
  const [joinedFilter, setJoinedFilter] = useState(() =>
    pickParam(searchParams.get("joined"), VALID_JOINED, "all")
  );
  const [verifiedFilter, setVerifiedFilter] = useState(() =>
    pickParam(searchParams.get("verified"), VALID_VERIFIED, "all")
  );
  const [sort, setSort] = useState(() =>
    pickParam(
      searchParams.get("sort"),
      SORT_OPTIONS.map((o) => o.value),
      DEFAULT_SORT
    )
  );

  // Push filter + pagination state into the URL (shareable, survives refresh)
  const lastPushedParamsRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (vipFilter !== "all") params.set("vip", vipFilter);
    if (subscriptionFilter !== "all")
      params.set("subscription", subscriptionFilter);
    if (joinedFilter !== "all") params.set("joined", joinedFilter);
    if (verifiedFilter !== "all") params.set("verified", verifiedFilter);
    if (sort !== DEFAULT_SORT) params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const key = params.toString();
    if (key !== searchParams.toString()) {
      lastPushedParamsRef.current = key;
      router.replace(key ? `${pathname}?${key}` : pathname, { scroll: false });
    }
  }, [
    debouncedSearchQuery,
    roleFilter,
    vipFilter,
    subscriptionFilter,
    joinedFilter,
    verifiedFilter,
    sort,
    page,
    pathname,
    router,
    searchParams,
  ]);

  // Restore state when the URL changes externally (browser back/forward)
  useEffect(() => {
    const key = searchParams.toString();
    if (lastPushedParamsRef.current === key) {
      lastPushedParamsRef.current = null;
      return;
    }
    setPage(parsePageParam(searchParams.get("page")));
    const nextSearch = searchParams.get("search") ?? "";
    setSearchQuery((prev) => (prev === nextSearch ? prev : nextSearch));
    const nextRole = pickParam(searchParams.get("role"), VALID_ROLES, "all") as
      | "all"
      | "ADMIN"
      | "LISTENER";
    setRoleFilter((prev) => (prev === nextRole ? prev : nextRole));
    const nextVip = pickParam(searchParams.get("vip"), VALID_VIP, "all") as
      | "all"
      | "vip"
      | "non-vip";
    setVipFilter((prev) => (prev === nextVip ? prev : nextVip));
    const nextSub = pickParam(
      searchParams.get("subscription"),
      VALID_SUBSCRIPTION,
      "all"
    );
    setSubscriptionFilter((prev) => (prev === nextSub ? prev : nextSub));
    const nextJoined = pickParam(searchParams.get("joined"), VALID_JOINED, "all");
    setJoinedFilter((prev) => (prev === nextJoined ? prev : nextJoined));
    const nextVerified = pickParam(
      searchParams.get("verified"),
      VALID_VERIFIED,
      "all"
    );
    setVerifiedFilter((prev) => (prev === nextVerified ? prev : nextVerified));
    const nextSort = pickParam(
      searchParams.get("sort"),
      SORT_OPTIONS.map((o) => o.value),
      DEFAULT_SORT
    );
    setSort((prev) => (prev === nextSort ? prev : nextSort));
  }, [searchParams]);

  // Filter changes always restart from page 1
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };
  const handleRoleChange = (value: "all" | "ADMIN" | "LISTENER") => {
    setRoleFilter(value);
    setPage(1);
  };
  const handleVipChange = (value: "all" | "vip" | "non-vip") => {
    setVipFilter(value);
    setPage(1);
  };
  const handleSubscriptionChange = (value: string) => {
    setSubscriptionFilter(value);
    setPage(1);
  };
  const handleJoinedChange = (value: string) => {
    setJoinedFilter(value);
    setPage(1);
  };
  const handleVerifiedChange = (value: string) => {
    setVerifiedFilter(value);
    setPage(1);
  };
  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

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
  const [detailUserId, setDetailUserId] = useState<string | null>(null);

  const {
    users,
    pagination,
    isError: error,
    isLoading,
    mutate: mutateUsers,
  } = useAdminUsers({
    search: debouncedSearchQuery,
    role: roleFilter,
    vip: vipFilter,
    subscription: subscriptionFilter,
    joined: joinedFilter,
    verified: verifiedFilter,
    sort,
    page,
    limit: ADMIN_PAGE_SIZE,
  });

  const { stats: summary, isLoading: statsLoading } = useAdminUserStats();

  const sortedUsers = useMemo(() => users as AdminUser[], [users]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (debouncedSearchQuery) n++;
    if (roleFilter !== "all") n++;
    if (vipFilter !== "all") n++;
    if (subscriptionFilter !== "all") n++;
    if (joinedFilter !== "all") n++;
    if (verifiedFilter !== "all") n++;
    return n;
  }, [
    debouncedSearchQuery,
    roleFilter,
    vipFilter,
    subscriptionFilter,
    joinedFilter,
    verifiedFilter,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setVipFilter("all");
    setSubscriptionFilter("all");
    setJoinedFilter("all");
    setVerifiedFilter("all");
    setSort("newest");
    setPage(1);
  };

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

  const toggleVip = async (user: Pick<AdminUser, "id" | "email" | "isPremium">) => {
    const full = sortedUsers.find((u) => u.id === user.id);
    setVipDialogUser(
      (full ?? { ...user, name: null } as AdminUser)
    );
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

  const toggleJoinedSort = () => {
    handleSortChange(sort === "newest" ? "oldest" : "newest");
  };

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Failed to load users
      </div>
    );
  }

  const statCards = [
    {
      title: "Total users",
      value: summary?.total ?? 0,
      sub: `${summary?.newThisWeek ?? 0} new this week`,
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "VIP members",
      value: summary?.vip ?? 0,
      sub: `${summary?.activeSubscriptions ?? 0} active subs`,
      icon: Crown,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "New this month",
      value: summary?.newThisMonth ?? 0,
      sub: `${summary?.newThisWeek ?? 0} in last 7 days`,
      icon: UserPlus,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Pending payments",
      value: summary?.pendingPayments ?? 0,
      sub: `${summary?.unverified ?? 0} unverified emails`,
      icon: Clock,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Users</h2>
          <p className="text-muted-foreground mt-1">
            Manage users, roles, and VIP status
            {pagination ? ` · ${pagination.total.toLocaleString()} total` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(sortedUsers)}
            disabled={sortedUsers.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statsLoading || !summary
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-card rounded-lg border border-border p-4 space-y-2"
              >
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))
          : statCards.map((stat) => (
              <div
                key={stat.title}
                className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <div className={`${stat.bgColor} p-1.5 rounded-md`}>
                    <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">{stat.sub}</p>
              </div>
            ))}
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              value={roleFilter}
              onValueChange={(value) =>
                handleRoleChange(value as "all" | "ADMIN" | "LISTENER")
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="LISTENER">Listener</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={vipFilter}
              onValueChange={(value) =>
                handleVipChange(value as "all" | "vip" | "non-vip")
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="VIP" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All users</SelectItem>
                <SelectItem value="vip">VIP only</SelectItem>
                <SelectItem value="non-vip">Non-VIP</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={subscriptionFilter}
              onValueChange={handleSubscriptionChange}
            >
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Subscription" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any sub</SelectItem>
                <SelectItem value="active">Active sub</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="none">No sub</SelectItem>
              </SelectContent>
            </Select>
            <Select value={joinedFilter} onValueChange={handleJoinedChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Joined" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any time</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select value={verifiedFilter} onValueChange={handleVerifiedChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Verified" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="unverified">Unverified</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <FilterX className="w-4 h-4 mr-1.5" />
                Clear ({activeFilterCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading && users.length === 0 ? (
          <AdminListPageSkeleton withSearch={false} />
        ) : sortedUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {activeFilterCount > 0
                ? "No users match your filters"
                : "No users found"}
            </p>
            {activeFilterCount > 0 && (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[220px]">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground min-w-[150px]">
                    Engagement
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden xl:table-cell">
                    Last active
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                    <button
                      onClick={toggleJoinedSort}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                      title="Toggle newest / oldest"
                    >
                      Joined
                      {sort === "newest" ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : sort === "oldest" ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : null}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((user) => {
                  const isUpdating = updatingUserId === user.id;
                  const subscriptionLabel = user.subscription
                    ? `${user.subscription.planType} (${user.subscription.status})`
                    : user.isPremium
                      ? "VIP access"
                      : "Free";

                  return (
                    <tr
                      key={user.id}
                      className="border-t border-border hover:bg-muted/40 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setDetailUserId(user.id)}
                          className="flex items-center gap-3 text-left w-full group"
                          title="View full profile"
                        >
                          {user.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.avatarUrl}
                              alt={user.name || user.email}
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div
                              title={user.name || user.email}
                              className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary uppercase shrink-0"
                            >
                              {getInitials(user.name, user.email)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium truncate group-hover:text-primary group-hover:underline underline-offset-4 flex items-center gap-1.5">
                              <span className="truncate">
                                {user.name || "Unnamed user"}
                              </span>
                              {user.role === "ADMIN" && (
                                <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                              )}
                              {user.emailVerified && (
                                <MailCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </div>
                            {(user.providers?.length ?? 0) > 0 && (
                              <div className="flex gap-1 mt-0.5">
                                {user.providers.map((p) => (
                                  <span
                                    key={p}
                                    className="text-[10px] uppercase tracking-wide text-muted-foreground/80 bg-muted px-1.5 py-px rounded"
                                  >
                                    {p}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-28">
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
                            <SelectTrigger className="h-8 text-xs">
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
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                              user.isPremium
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-gray-500/10 text-gray-500"
                            )}
                          >
                            <Crown className="w-3 h-3 mr-1" />
                            {user.isPremium ? "VIP" : "Free"}
                          </span>
                          <span
                            className={cn(
                              "text-[11px]",
                              user.subscription?.status === "ACTIVE"
                                ? "text-green-600 dark:text-green-400"
                                : "text-muted-foreground"
                            )}
                            title={
                              user.subscription?.endDate
                                ? `Ends ${formatDate(user.subscription.endDate)}`
                                : undefined
                            }
                          >
                            {subscriptionLabel}
                          </span>
                          {user.subscription?.endDate && (
                            <span className="text-[11px] text-muted-foreground">
                              Ends {formatDate(user.subscription.endDate)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <div>
                            <span className="font-semibold text-foreground">
                              {user.stats.playHistory.toLocaleString()}
                            </span>{" "}
                            plays ·{" "}
                            <span className="font-semibold text-foreground">
                              {user.stats.playlists}
                            </span>{" "}
                            lists
                          </div>
                          <div>
                            <span className="font-semibold text-foreground">
                              {user.stats.likedSongs}
                            </span>{" "}
                            likes ·{" "}
                            <span className="font-semibold text-foreground">
                              {user.stats.likedArtists}
                            </span>{" "}
                            artists
                          </div>
                          {(user.stats.paymentRequests > 0 ||
                            user.stats.deviceLicenses > 0) && (
                            <div className="flex gap-1 pt-0.5">
                              {user.stats.paymentRequests > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5"
                                >
                                  {user.stats.paymentRequests} payments
                                </Badge>
                              )}
                              {user.stats.deviceLicenses > 0 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] px-1.5"
                                >
                                  {user.stats.deviceLicenses} devices
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell whitespace-nowrap">
                        {timeAgo(user.lastActiveAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDetailUserId(user.id)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleVip(user)}
                            disabled={isUpdating}
                            className="hidden sm:inline-flex"
                          >
                            {user.isPremium ? "Remove VIP" : "Make VIP"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminPagination
        pagination={pagination}
        page={page}
        onPageChange={setPage}
      />

      <UserDetailDrawer
        userId={detailUserId}
        onClose={() => setDetailUserId(null)}
        onMakeVip={toggleVip}
      />

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

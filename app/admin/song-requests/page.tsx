"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  CheckCircle,
  XCircle,
  Search,
  Check,
  X,
  AlertCircle,
  Music,
  ExternalLink,
} from "lucide-react";
import {
  AdminCardListSkeleton,
  AdminPageHeaderSkeleton,
} from "@/components/loading-skeletons";
import { toast } from "sonner";
import { useAdminSongRequests } from "@/lib/swr";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";
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
import { Badge } from "@/components/ui/badge";

interface SongRequestUser {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface SongRequestReviewer {
  id: string;
  name: string | null;
}

interface SongRequest {
  id: string;
  userId: string;
  songTitle: string;
  artistName: string;
  notes: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: SongRequestUser;
  reviewer: SongRequestReviewer | null;
}

export default function SongRequestsPage() {
  const [mounted, setMounted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<SongRequest | null>(null);
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    requests,
    pagination,
    isError: error,
    isLoading,
    mutate,
  } = useAdminSongRequests({
    status: statusFilter,
    search: search || undefined,
    page,
    limit: ADMIN_PAGE_SIZE,
  });

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/song-requests/${selectedRequest.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: actionType }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${actionType.toLowerCase()} request`);
        return;
      }

      toast.success(`Song request ${actionType.toLowerCase()}`);
      setSelectedRequest(null);
      setActionType(null);
      mutate();
    } catch (error) {
      console.error(`Error updating song request:`, error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20">Pending</Badge>;
      case "APPROVED":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Approved</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!mounted) {
    return (
      <div className="space-y-6">
        <AdminPageHeaderSkeleton />
        <AdminCardListSkeleton rows={6} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-destructive">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h3 className="text-lg font-bold">Failed to load song requests</h3>
        <p className="text-sm">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Song Requests</h2>
          <p className="text-muted-foreground">
            Review and manage song requests from listeners
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search songs..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10 w-[200px]"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading ? (
          <AdminCardListSkeleton rows={6} />
        ) : requests.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>No song requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Song Title</th>
                  <th className="px-4 py-3 text-left font-medium">Artist</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((request: SongRequest) => (
                  <tr key={request.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary uppercase">
                          {request.user.name?.charAt(0) || request.user.email.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{request.user.name || "Unnamed"}</span>
                          <span className="text-xs text-muted-foreground">{request.user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{request.songTitle}</td>
                    <td className="px-4 py-3 max-w-[150px] truncate">{request.artistName}</td>
                    <td className="px-4 py-3">{getStatusBadge(request.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {request.status === "PENDING" && (
                          <>
                            <Link
                              href={`/admin/songs/new?songRequest=${request.id}&title=${encodeURIComponent(request.songTitle)}&artist=${encodeURIComponent(request.artistName)}`}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-primary hover:text-primary hover:bg-primary/10"
                                title="Add Song"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType("APPROVED");
                              }}
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType("REJECTED");
                              }}
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {request.status === "APPROVED" && (
                          <Link
                            href={`/admin/songs/new?songRequest=${request.id}&title=${encodeURIComponent(request.songTitle)}&artist=${encodeURIComponent(request.artistName)}`}
                          >
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              title="Add Song"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AdminPagination
        pagination={pagination}
        page={page}
        onPageChange={setPage}
        className="justify-center"
      />

      {/* Action Dialog (Approve/Reject) */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "APPROVED" ? (
                <><CheckCircle className="w-5 h-5 text-emerald-500" /> Approve Request</>
              ) : (
                <><XCircle className="w-5 h-5 text-destructive" /> Reject Request</>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === "APPROVED"
                ? `Mark "${selectedRequest?.songTitle}" by ${selectedRequest?.artistName} as approved.`
                : `Reject the request for "${selectedRequest?.songTitle}" by ${selectedRequest?.artistName}.`}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant={actionType === "APPROVED" ? "default" : "destructive"}
              className={actionType === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              onClick={handleAction}
              disabled={isUpdating}
            >
              {isUpdating ? "Processing..." : actionType === "APPROVED" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

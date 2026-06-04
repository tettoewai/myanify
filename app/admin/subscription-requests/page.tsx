"use client";

import { useMemo, useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Search,
  Filter,
  Check,
  X,
  AlertCircle
} from "lucide-react";
import {
  AdminCardListSkeleton,
  AdminPageHeaderSkeleton,
} from "@/components/loading-skeletons";
import { toast } from "sonner";
import { useSubscriptionRequests } from "@/lib/swr";
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
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";

export const dynamic = "force-dynamic";

interface User {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
}

interface PaymentMethod {
  id: string;
  name: string;
  type: string;
  accountName: string;
  accountNumber: string;
}

interface PaymentRequest {
  id: string;
  userId: string;
  planType: string;
  amount: number;
  currency: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "EXPIRED";
  paymentMethodId: string;
  transactionId: string | null;
  proofImageUrl: string | null;
  notes: string | null;
  rejectedReason: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  paymentMethod: PaymentMethod;
}

interface PaymentRequestsResponse {
  data: PaymentRequest[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function SubscriptionRequestsPage() {
  const [mounted, setMounted] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [page, setPage] = useState(1);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [adminPassword, setAdminPassword] = useState("");
  const [notes, setNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [viewProofImage, setViewProofImage] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    requests,
    pagination,
    isError: error,
    isLoading,
    mutate,
  } = useSubscriptionRequests({
    status: statusFilter,
    page,
    limit: 20,
  });

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;
    if (!adminPassword.trim()) {
      toast.error("Admin password is required");
      return;
    }

    try {
      setIsUpdating(true);
      const response = await fetch(`/api/vip/payment/${selectedRequest.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          notes,
          adminPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || `Failed to ${actionType} request`);
        return;
      }

      toast.success(result.message || `Request ${actionType}ed successfully`);
      setSelectedRequest(null);
      setActionType(null);
      setAdminPassword("");
      setNotes("");
      mutate();
    } catch (error) {
      console.error(`Error ${actionType}ing request:`, error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 px-2">Pending</Badge>;
      case "VERIFIED":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">Verified</Badge>;
      case "REJECTED":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">Rejected</Badge>;
      case "EXPIRED":
        return <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Expired</Badge>;
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
        <h3 className="text-lg font-bold">Failed to load requests</h3>
        <p className="text-sm">Please try refreshing the page</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Subscription Requests</h2>
          <p className="text-muted-foreground">
            Review and approve manual payment proofs from listeners
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="VERIFIED">Verified</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
              <SelectItem value="EXPIRED">Expired</SelectItem>
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
            <p>No subscription requests found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Plan</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Payment Method</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((request: PaymentRequest) => (
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
                    <td className="px-4 py-3 font-medium">{request.planType}</td>
                    <td className="px-4 py-3">
                      {request.amount} {request.currency}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span>{request.paymentMethod.name}</span>
                        <span className="text-xs text-muted-foreground">{request.transactionId || "No TX ID"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(request.status)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {request.proofImageUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setViewProofImage(request.proofImageUrl)}
                            title="View Proof"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        )}
                        {request.status === "PENDING" && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                              onClick={() => {
                                setSelectedRequest(request);
                                setActionType("approve");
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
                                setActionType("reject");
                              }}
                              title="Reject"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === pagination.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* Action Dialog (Approve/Reject) */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === "approve" ? (
                <><CheckCircle className="w-5 h-5 text-emerald-500" /> Approve Request</>
              ) : (
                <><XCircle className="w-5 h-5 text-destructive" /> Reject Request</>
              )}
            </DialogTitle>
            <DialogDescription>
              Confirming this action will {actionType === "approve" ? "activate" : "reject"} the VIP subscription for {selectedRequest?.user.email}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder={actionType === "reject" ? "Reason for rejection..." : "Any additional notes..."}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-destructive">Admin Password Required</label>
              <Input
                type="password"
                placeholder="Enter your admin password to confirm"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              className={actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}
              onClick={handleAction}
              disabled={isUpdating || !adminPassword}
            >
              {isUpdating ? "Processing..." : actionType === "approve" ? "Approve & Activate" : "Confirm Rejection"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={!!viewProofImage} onOpenChange={(open) => !open && setViewProofImage(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black/95">
          <div className="relative aspect-[3/4] w-full max-h-[80vh]">
            {viewProofImage && (
              <Image
                src={viewProofImage}
                alt="Payment Proof"
                fill
                className="object-contain"
                unoptimized
              />
            )}
          </div>
          <div className="p-4 flex justify-between items-center bg-card border-t">
            <span className="text-sm font-medium">Payment Proof Image</span>
            <Button variant="outline" size="sm" onClick={() => setViewProofImage(null)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

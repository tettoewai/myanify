"use client";

import { toast } from "sonner";
import { AdminListPageSkeleton } from "@/components/loading-skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Edit, Plus, Trash2, CheckCircle, XCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { usePaymentMethods } from "@/lib/swr";

export const dynamic = "force-dynamic";

export default function PaymentMethodsPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<string | null>(null);

  const {
    paymentMethods,
    isLoading,
    mutate: mutatePaymentMethods,
  } = usePaymentMethods();

  const handleDeleteClick = (id: string) => {
    setMethodToDelete(id);
    setDeleteDialogOpen(true);
  };

  const deletePaymentMethod = async () => {
    if (!methodToDelete) return;

    try {
      const response = await fetch(`/api/admin/payment-methods/${methodToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Payment method deleted successfully");
        mutatePaymentMethods();
        setDeleteDialogOpen(false);
        setMethodToDelete(null);
      } else {
        toast.error("Failed to delete payment method");
      }
    } catch (error) {
      console.error("Error deleting payment method:", error);
      toast.error("Failed to delete payment method");
    }
  };

  if (isLoading) {
    return <AdminListPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Payment Methods</h2>
          <p className="text-muted-foreground mt-1">Manage payment methods for subscriptions</p>
        </div>
        <Button asChild>
          <Link href="/admin/payment-methods/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Payment Method
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-6 border-b bg-muted/50 p-4 font-medium text-muted-foreground">
          <div className="col-span-2">Name</div>
          <div>Type</div>
          <div>Account Info</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y">
          {paymentMethods.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No payment methods found. Create one to get started.
            </div>
          ) : (
            paymentMethods.map((method: any) => (
              <div
                key={method.id}
                className="grid grid-cols-6 items-center p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="col-span-2">
                    <div className="font-medium">{method.name}</div>
                    <div className="text-sm text-muted-foreground">Order: {method.displayOrder}</div>
                </div>
                <div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {method.type.replace(/_/g, " ")}
                  </span>
                </div>
                <div className="text-sm">
                    {method.accountName && <div>{method.accountName}</div>}
                    {method.accountNumber && <div className="text-muted-foreground font-mono">{method.accountNumber}</div>}
                </div>
                <div>
                  {method.isActive ? (
                    <div className="flex items-center text-green-500">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Active
                    </div>
                  ) : (
                    <div className="flex items-center text-red-500">
                      <XCircle className="w-4 h-4 mr-2" />
                      Inactive
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    asChild
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  >
                    <Link href={`/admin/payment-methods/${method.id}/edit`}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteClick(method.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment Method</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this payment method? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deletePaymentMethod}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

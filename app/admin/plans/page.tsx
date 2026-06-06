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
import { usePlans } from "@/lib/swr";
import { mutate } from "swr";


export default function PlansPage() {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  const {
    plans,
    isLoading,
    mutate: mutatePlans,
  } = usePlans();

  const handleDeleteClick = (planId: string) => {
    setPlanToDelete(planId);
    setDeleteDialogOpen(true);
  };

  const deletePlan = async () => {
    if (!planToDelete) return;

    try {
      const response = await fetch(`/api/admin/plans/${planToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Plan deleted successfully");
        mutatePlans();
        setDeleteDialogOpen(false);
        setPlanToDelete(null);
      } else {
        toast.error("Failed to delete plan");
      }
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error("Failed to delete plan");
    }
  };

  if (isLoading) {
    return <AdminListPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Plans</h2>
          <p className="text-muted-foreground mt-1">Manage subscription plans</p>
        </div>
        <Button asChild>
          <Link href="/admin/plans/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Plan
          </Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <div className="grid grid-cols-6 border-b bg-muted/50 p-4 font-medium text-muted-foreground">
          <div className="col-span-2">Name</div>
          <div>Price</div>
          <div>Type</div>
          <div>Status</div>
          <div className="text-right">Actions</div>
        </div>
        <div className="divide-y">
          {plans.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No plans found. Create one to get started.
            </div>
          ) : (
            plans.map((plan: any) => (
              <div
                key={plan.id}
                className="grid grid-cols-6 items-center p-4 hover:bg-muted/50 transition-colors"
              >
                <div className="col-span-2 font-medium">{plan.name}</div>
                <div>{plan.price} MMK</div>
                <div>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                    {plan.type}
                  </span>
                </div>
                <div>
                  {plan.isActive ? (
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
                    <Link href={`/admin/plans/${plan.id}/edit`}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDeleteClick(plan.id)}
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
            <DialogTitle>Delete Plan</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this plan? This action cannot be
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
            <Button variant="destructive" onClick={deletePlan}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

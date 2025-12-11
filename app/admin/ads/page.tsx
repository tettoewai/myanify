"use client";

import { useState, useMemo } from "react";
import { Plus, Edit, Trash2, Search, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { useAds } from "@/lib/swr";
import { mutate } from "swr";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Ad {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string;
  sponsor: string;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
  impressionCount: number;
  clickCount: number;
  createdAt: string;
}

export default function AdsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [adToDelete, setAdToDelete] = useState<string | null>(null);

  const { ads: allAds, isLoading, mutate: mutateAds } = useAds({ limit: 100 });

  const toggleActive = async (adId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/ads/${adId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        toast.success(`Ad ${!currentStatus ? "activated" : "deactivated"} successfully`);
        mutateAds();
        mutate("/api/ads");
      } else {
        toast.error("Failed to update ad status");
      }
    } catch (error) {
      console.error("Error toggling ad status:", error);
      toast.error("Failed to update ad status");
    }
  };

  const handleDeleteClick = (adId: string) => {
    setAdToDelete(adId);
    setDeleteDialogOpen(true);
  };

  const deleteAd = async () => {
    if (!adToDelete) return;

    try {
      const response = await fetch(`/api/ads/${adToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Ad deleted successfully");
        mutateAds();
        mutate("/api/ads");
        setDeleteDialogOpen(false);
        setAdToDelete(null);
      } else {
        toast.error("Failed to delete ad");
      }
    } catch (error) {
      console.error("Error deleting ad:", error);
      toast.error("Failed to delete ad");
    }
  };

  const filteredAds = useMemo(
    () =>
      (allAds || []).filter(
        (ad: Ad) =>
          ad.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          ad.description?.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [allAds, searchQuery]
  );

  if (isLoading) {
    return <div className="text-center py-12">Loading ads...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Ads</h2>
          <p className="text-muted-foreground mt-1">
            Manage advertisements and sponsored content
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/ads/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Ad
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search ads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAds.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No ads found
          </div>
        ) : (
          filteredAds.map((ad) => (
            <div
              key={ad.id}
              className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
            >
              {ad.imageUrl && (
                <div className="aspect-video relative">
                  <img
                    src={ad.imageUrl}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{ad.title}</h3>
                  {ad.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {ad.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-muted-foreground">Impressions</p>
                    <p className="font-medium">
                      {ad.impressionCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clicks</p>
                    <p className="font-medium">
                      {ad.clickCount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        ad.isActive
                          ? "bg-green-500/10 text-green-500"
                          : "bg-gray-500/10 text-gray-500"
                      }`}
                    >
                      {ad.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleActive(ad.id, ad.isActive)}
                    title={ad.isActive ? "Deactivate" : "Activate"}
                    className="flex-1"
                  >
                    {ad.isActive ? (
                      <EyeOff className="w-4 h-4 mr-2" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    {ad.isActive ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/admin/ads/${ad.id}/edit`}>
                      <Edit className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(ad.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setAdToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the ad
              and remove all associated data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={deleteAd}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { toast } from "sonner";
import { AdminGridPageSkeleton } from "@/components/loading-skeletons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Edit, Plus, Search, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useArtists } from "@/lib/swr";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ADMIN_GRID_PAGE_SIZE } from "@/lib/pagination";
import { mutate } from "swr";
import { useDebounce } from "@/hooks/use-debounce";


interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  bio: string | null;
  monthlyListeners: number;
  createdAt: string;
}

export default function ArtistsPage() {
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<string | null>(null);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchQuery]);

  const {
    artists,
    pagination,
    isLoading,
    mutate: mutateArtists,
  } = useArtists({
    search: debouncedSearchQuery || undefined,
    page,
    limit: ADMIN_GRID_PAGE_SIZE,
  });

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = "/placeholder.svg";
  };

  const handleDeleteClick = (artistId: string) => {
    setArtistToDelete(artistId);
    setDeleteDialogOpen(true);
  };

  const deleteArtist = async () => {
    if (!artistToDelete) return;

    try {
      const response = await fetch(`/api/artists/${artistToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Artist deleted successfully");
        mutateArtists();
        mutate("/api/artists");
        setDeleteDialogOpen(false);
        setArtistToDelete(null);
      } else {
        toast.error("Failed to delete artist");
      }
    } catch (error) {
      console.error("Error deleting artist:", error);
      toast.error("Failed to delete artist");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Artists</h2>
          <p className="text-muted-foreground mt-1">Manage artist profiles</p>
        </div>
        <Button asChild>
          <Link href="/admin/artists/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Artist
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading && artists.length === 0 ? (
          <div className="col-span-full">
            <AdminGridPageSkeleton withHeader={false} withSearch={false} />
          </div>
        ) : artists.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No artists found
          </div>
        ) : (
          artists.map((artist) => (
            <div
              key={artist.id}
              className="bg-card rounded-lg border border-border p-6 hover:shadow-lg transition-shadow flex flex-col h-full"
            >
              <div className="flex items-start gap-4 flex-1">
                <Image
                  width={64}
                  height={64}
                  src={artist.imageUrl || "/placeholder.svg"}
                  alt={artist.name}
                  className="w-16 h-16 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-lg truncate">
                    {artist.name}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {artist.monthlyListeners.toLocaleString()} monthly listeners
                  </p>
                  {artist.bio && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {artist.bio}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button variant="ghost" size="sm" asChild className="flex-1">
                  <Link href={`/admin/artists/${artist.id}/edit`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteClick(artist.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <AdminPagination
        pagination={pagination}
        page={page}
        onPageChange={setPage}
      />

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteDialogOpen(false);
            setArtistToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              artist and remove all associated data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={deleteArtist}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

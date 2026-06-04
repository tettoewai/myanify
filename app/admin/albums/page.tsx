"use client";

import { useState, useMemo } from "react";
import { AdminGridPageSkeleton } from "@/components/loading-skeletons";
import Image from "next/image";
import { Plus, Edit, Trash2, Search, Music } from "lucide-react";
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
import { useAlbums, useSongs } from "@/lib/swr";
import { mutate } from "swr";
import Link from "next/link";
import { AlbumTypeBadge } from "@/components/album-type-badge";
import type { AlbumType } from "@/lib/album-type";

export const dynamic = "force-dynamic";

interface Album {
  id: string;
  name: string;
  coverUrl: string | null;
  type: AlbumType;
  description: string | null;
  releaseDate: string | null;
  createdAt: string;
  _count?: {
    songs: number;
  };
}

export default function AlbumsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);

  const { albums, isLoading, mutate: mutateAlbums } = useAlbums();
  const { songs: allSongs } = useSongs();

  // Calculate song counts for each album using useMemo to prevent infinite loops
  const albumsWithCounts = useMemo(() => {
    if (!albums || albums.length === 0) return [];
    if (!allSongs)
      return albums.map((album: Album) => ({ ...album, _count: { songs: 0 } }));
    return albums.map((album: Album) => {
      const songCount = allSongs.filter(
        (song: any) => (song as any).albumId === album.id
      ).length;
      return {
        ...album,
        _count: { songs: songCount },
      };
    });
  }, [albums, allSongs]);

  const handleDeleteClick = (albumId: string) => {
    setAlbumToDelete(albumId);
    setDeleteDialogOpen(true);
  };

  const deleteAlbum = async () => {
    if (!albumToDelete) return;

    try {
      const response = await fetch(`/api/albums/${albumToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Album deleted successfully");
        mutateAlbums();
        mutate("/api/albums");
        setDeleteDialogOpen(false);
        setAlbumToDelete(null);
      } else {
        toast.error("Failed to delete album");
      }
    } catch (error) {
      console.error("Error deleting album:", error);
      toast.error("Failed to delete album");
    }
  };

  const filteredAlbums = useMemo(
    () =>
      albumsWithCounts.filter((album: Album) =>
        album.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [albumsWithCounts, searchQuery]
  );

  if (isLoading) {
    return <AdminGridPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Albums</h2>
          <p className="text-muted-foreground mt-1">Manage music albums</p>
        </div>
        <Button asChild>
          <Link href="/admin/albums/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Album
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search albums..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredAlbums.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No albums found
          </div>
        ) : (
          filteredAlbums.map((album: Album) => (
            <div
              key={album.id}
              className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square relative">
                <Image
                  src={album.coverUrl || "/placeholder.svg"}
                  alt={album.name}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <AlbumTypeBadge type={album.type} />
                  </div>
                  <h3 className="font-bold text-white text-lg">{album.name}</h3>
                  {album.releaseDate && (
                    <p className="text-sm text-white/80">
                      {new Date(album.releaseDate).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
              <div className="p-4">
                {album.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {album.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                  <Music className="w-4 h-4" />
                  <span>{album._count?.songs || 0} songs</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild className="flex-1">
                    <Link href={`/admin/albums/${album.id}/edit`}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(album.id)}
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
            setAlbumToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              album and remove all associated data from our servers. Songs
              linked to this album will have their album reference removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={deleteAlbum}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

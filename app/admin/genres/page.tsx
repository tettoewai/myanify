"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Search } from "lucide-react";
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
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Genre {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
  createdAt: string;
}

export default function GenresPage() {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [genreToDelete, setGenreToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchGenres();
  }, []);

  const fetchGenres = async () => {
    try {
      const response = await fetch("/api/genres");
      const data = await response.json();
      setGenres(data.data || []);
    } catch (error) {
      console.error("Error fetching genres:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (genreId: string) => {
    setGenreToDelete(genreId);
    setDeleteDialogOpen(true);
  };

  const deleteGenre = async () => {
    if (!genreToDelete) return;

    try {
      const response = await fetch(`/api/genres/${genreToDelete}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchGenres();
        setDeleteDialogOpen(false);
        setGenreToDelete(null);
      }
    } catch (error) {
      console.error("Error deleting genre:", error);
    }
  };

  const filteredGenres = genres.filter((genre) =>
    genre.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return <div className="text-center py-12">Loading genres...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Genres</h2>
          <p className="text-muted-foreground mt-1">Manage music genres</p>
        </div>
        <Button asChild>
          <Link href="/admin/genres/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Genre
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredGenres.length === 0 ? (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            No genres found
          </div>
        ) : (
          filteredGenres.map((genre) => (
            <div
              key={genre.id}
              className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="aspect-square relative">
                <img
                  src={genre.imageUrl || "/placeholder.svg"}
                  alt={genre.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-bold text-white text-lg">{genre.name}</h3>
                </div>
              </div>
              <div className="p-4">
                {genre.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                    {genre.description}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild className="flex-1">
                    <Link href={`/admin/genres/${genre.id}/edit`}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(genre.id)}
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
            setGenreToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you absolutely sure?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the
              genre and remove all associated data from our servers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={deleteGenre}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

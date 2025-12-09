"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import Link from "next/link";

export const dynamic = "force-dynamic";

type FilterStatus = "all" | "published" | "draft";

interface Song {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  coverUrl: string | null;
  isPremium: boolean;
  isPublished: boolean;
  playCount: number;
  artist: {
    id: string;
    name: string;
  };
  genre: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
}

export default function SongsPage() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSongs(filterStatus);
  }, [filterStatus]);

  const fetchSongs = async (status: FilterStatus = "all") => {
    setLoading(true);
    try {
      const query =
        status === "all"
          ? ""
          : `?isPublished=${status === "published" ? "true" : "false"}`;
      const response = await fetch(`/api/songs${query}`);
      const data = await response.json();
      setSongs(data.data || []);
    } catch (error) {
      console.error("Error fetching songs:", error);
    } finally {
      setLoading(false);
    }
  };

  const togglePublish = async (songId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });

      if (response.ok) {
        fetchSongs();
      }
    } catch (error) {
      console.error("Error toggling publish status:", error);
    }
  };

  const deleteSong = async (songId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSongs();
      }
    } catch (error) {
      console.error("Error deleting song:", error);
    } finally {
      setDeleting(false);
      setSongToDelete(null);
    }
  };

  const filteredSongs = songs.filter(
    (song) =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDuration = (seconds: number) => {
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)} min`;
  };

  const StatusButton = ({
    label,
    value,
  }: {
    label: string;
    value: FilterStatus;
  }) => (
    <Button
      variant={filterStatus === value ? "default" : "outline"}
      size="sm"
      onClick={() => setFilterStatus(value)}
    >
      {label}
    </Button>
  );

  if (loading) {
    return <div className="text-center py-12">Loading songs...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Songs</h2>
          <p className="text-muted-foreground mt-1">
            Manage all songs in your library
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/songs/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Song
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <StatusButton label="All" value="all" />
          <StatusButton label="Published" value="published" />
          <StatusButton label="Drafts" value="draft" />
        </div>
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Cover</th>
                <th className="text-left p-4 text-sm font-medium">Title</th>
                <th className="text-left p-4 text-sm font-medium">Artist</th>
                <th className="text-left p-4 text-sm font-medium">Genre</th>
                <th className="text-left p-4 text-sm font-medium">Duration</th>
                <th className="text-left p-4 text-sm font-medium">Plays</th>
                <th className="text-left p-4 text-sm font-medium">Status</th>
                <th className="text-left p-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSongs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="p-8 text-center text-muted-foreground"
                  >
                    No songs found
                  </td>
                </tr>
              ) : (
                filteredSongs.map((song) => (
                  <tr
                    key={song.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <img
                        src={song.coverUrl || "/placeholder.svg"}
                        alt={song.title}
                        className="w-12 h-12 rounded-md object-cover"
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{song.title}</p>
                        {song.isPremium && (
                          <span className="text-xs text-primary">Premium</span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {song.artist.name}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {song.genre?.name || "—"}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {formatDuration(song.duration)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {song.playCount.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          song.isPublished
                            ? "bg-green-500/10 text-green-500"
                            : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {song.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            togglePublish(song.id, song.isPublished)
                          }
                          title={song.isPublished ? "Unpublish" : "Publish"}
                        >
                          {song.isPublished ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/admin/songs/${song.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSongToDelete(song)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Dialog
        open={Boolean(songToDelete)}
        onOpenChange={(open) => {
          if (!open) setSongToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete song</DialogTitle>
            <DialogDescription>
              {`Are you sure you want to delete "${songToDelete?.title}"? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => songToDelete && deleteSong(songToDelete.id)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

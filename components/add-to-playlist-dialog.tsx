"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSession } from "next-auth/react";
import { requireLoginRedirect } from "@/lib/require-login";
import { usePlaylists } from "@/lib/swr";
import { Plus, ListMusic } from "lucide-react";
import { CreatePlaylistDialog } from "@/components/create-playlist-dialog";

// Create a client-only version to avoid hydration mismatches
const AddToPlaylistDialogContent = dynamic(() => Promise.resolve(AddToPlaylistDialogComponent), {
  ssr: false,
});

interface AddToPlaylistDialogProps {
  songId: string;
  trigger?: React.ReactNode;
  onSongAdded?: () => void;
}

function AddToPlaylistDialogComponent({
  songId,
  trigger,
  onSongAdded,
}: AddToPlaylistDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { data: session } = useSession();
  const { playlists, mutate } = usePlaylists({
    userId: session?.user?.id,
    enabled: !!session?.user?.id,
  });

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !session?.user?.id) {
      requireLoginRedirect();
      return;
    }
    setOpen(nextOpen);
  };

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!session?.user?.id) {
      requireLoginRedirect();
      return;
    }
    setIsLoading(playlistId);

    try {
      const response = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ songId }),
      });

      if (!response.ok) {
        throw new Error("Failed to add song to playlist");
      }

      // Refresh playlists data
      mutate();

      onSongAdded?.();
      setOpen(false);
    } catch (error) {
      console.error("Error adding song to playlist:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(null);
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="rounded-full">
      <Plus className="w-4 h-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add to Playlist</DialogTitle>
          <DialogDescription>
            Choose a playlist to add this song to.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <ScrollArea className="max-h-64">
            <div className="space-y-2">
              {playlists.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No playlists found. Create one first!
                </p>
              ) : (
                playlists.map((playlist) => (
                  <button
                    key={playlist.id}
                    onClick={() => handleAddToPlaylist(playlist.id)}
                    disabled={isLoading === playlist.id}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    <ListMusic className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <p className="font-medium">{playlist.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {playlist.songs.length} songs
                      </p>
                    </div>
                    {isLoading === playlist.id && (
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    )}
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
        <div className="flex justify-center">
          <CreatePlaylistDialog
            onPlaylistCreated={(newPlaylist) => {
              // Add the song to the newly created playlist
              handleAddToPlaylist(newPlaylist.id);
            }}
            trigger={
              <Button variant="outline" className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Create New Playlist
              </Button>
            }
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Dropdown version for use in menus
export function AddToPlaylistDropdown({
  songId,
  onSongAdded,
}: {
  songId: string;
  onSongAdded?: () => void;
}) {
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { data: session } = useSession();
  const { playlists, mutate } = usePlaylists({
    userId: session?.user?.id,
    enabled: !!session?.user?.id,
  });

  const handleAddToPlaylist = async (playlistId: string) => {
    if (!session?.user?.id) {
      requireLoginRedirect();
      return;
    }

    setIsLoading(playlistId);

    try {
      const response = await fetch(`/api/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ songId }),
      });

      if (!response.ok) {
        throw new Error("Failed to add song to playlist");
      }

      // Refresh playlists data
      mutate();

      onSongAdded?.();
    } catch (error) {
      console.error("Error adding song to playlist:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(null);
    }
  };

  const handleDropdownOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !session?.user?.id) {
      requireLoginRedirect();
      return;
    }
  };

  return (
    <DropdownMenu onOpenChange={handleDropdownOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add to Playlist
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <ScrollArea className="max-h-64">
          {playlists.length === 0 ? (
            <div className="p-2">
              <p className="text-sm text-muted-foreground text-center">
                No playlists found
              </p>
            </div>
          ) : (
            playlists.map((playlist) => (
              <DropdownMenuItem
                key={playlist.id}
                onClick={() => handleAddToPlaylist(playlist.id)}
                disabled={isLoading === playlist.id}
                className="cursor-pointer"
              >
                <ListMusic className="w-4 h-4 mr-2" />
                <div className="flex-1">
                  <p className="font-medium">{playlist.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {playlist.songs.length} songs
                  </p>
                </div>
                {isLoading === playlist.id && (
                  <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin ml-2" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
        <div className="border-t p-2">
          <CreatePlaylistDialog
            onPlaylistCreated={(newPlaylist) => {
              handleAddToPlaylist(newPlaylist.id);
            }}
            trigger={
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Create New Playlist
              </Button>
            }
          />
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export the client-only version to avoid hydration mismatches
export function AddToPlaylistDialog(props: AddToPlaylistDialogProps) {
  return <AddToPlaylistDialogContent {...props} />;
}
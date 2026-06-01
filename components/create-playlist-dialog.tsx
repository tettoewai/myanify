"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus } from "lucide-react";
import { useSession } from "next-auth/react";
import { requireLoginRedirect } from "@/lib/require-login";

// Create a client-only version to avoid hydration mismatches
const CreatePlaylistDialogContent = dynamic(() => Promise.resolve(CreatePlaylistDialogComponent), {
  ssr: false,
});

interface CreatePlaylistDialogProps {
  trigger?: React.ReactNode;
  onPlaylistCreated?: (playlist: any) => void;
}

function CreatePlaylistDialogComponent({
  trigger,
  onPlaylistCreated,
}: CreatePlaylistDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { data: session } = useSession();

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !session?.user?.id) {
      requireLoginRedirect();
      return;
    }
    setOpen(nextOpen);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session?.user?.id) {
      requireLoginRedirect();
      return;
    }

    if (!name.trim()) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create playlist");
      }

      const playlist = await response.json();

      setOpen(false);
      setName("");
      setDescription("");
      setIsPublic(true);

      onPlaylistCreated?.(playlist);

      // Navigate to the new playlist
      router.push(`/playlist/${playlist.id}`);
    } catch (error) {
      console.error("Error creating playlist:", error);
      // TODO: Show error toast
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTrigger = (
    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
      <Plus className="w-4 h-4 mr-2" />
      Create Playlist
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Playlist</DialogTitle>
            <DialogDescription>
              Create a new playlist to organize your favorite songs.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Awesome Playlist"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A collection of my favorite songs..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="public"
                checked={isPublic}
                onCheckedChange={(checked) => setIsPublic(checked as boolean)}
              />
              <Label htmlFor="public" className="text-sm">
                Make playlist public
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !name.trim()}>
              {isLoading ? "Creating..." : "Create Playlist"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Export the client-only version to avoid hydration mismatches
export function CreatePlaylistDialog(props: CreatePlaylistDialogProps) {
  return <CreatePlaylistDialogContent {...props} />;
}
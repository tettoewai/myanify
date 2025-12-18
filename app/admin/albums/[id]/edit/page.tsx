"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Image as ImageIcon,
  Loader2,
  Music,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useAlbum } from "@/lib/swr";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Album {
  id: string;
  name: string;
  coverUrl: string | null;
  description: string | null;
  releaseDate: string | null;
  songs?: Array<{
    id: string;
    title: string;
    artist: {
      id: string;
      name: string;
    };
    genre: {
      id: string;
      name: string;
    } | null;
  }>;
}

export default function EditAlbumPage() {
  const router = useRouter();
  const params = useParams();
  const albumId = params.id as string;
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    releaseDate: "",
  });
  const [coverUrl, setCoverUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  const { album, isLoading: albumLoading } = useAlbum(albumId);

  useEffect(() => {
    if (album) {
      setFormData({
        name: album.name,
        description: album.description || "",
        releaseDate: album.releaseDate
          ? new Date(album.releaseDate).toISOString().split("T")[0]
          : "",
      });
      setCoverUrl(album.coverUrl || "");
    }
  }, [album]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setImageFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "image");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      setCoverUrl(data.url);
      toast.success("Cover image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image file");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      toast.error("Please fill in the album name");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          coverUrl: coverUrl || null,
          description: formData.description || null,
          releaseDate: formData.releaseDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update album");
      }

      toast.success("Album updated successfully");
      router.push("/admin/albums");
    } catch (error) {
      console.error("Error updating album:", error);
      toast.error("Failed to update album");
    } finally {
      setSaving(false);
    }
  };

  if (albumLoading) {
    return <div className="text-center py-12">Loading album...</div>;
  }

  if (!album) {
    return <div className="text-center py-12">Album not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/albums">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Edit Album</h2>
          <p className="text-muted-foreground mt-1">Update album information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cover Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Album Cover
              </CardTitle>
              <CardDescription>
                Upload a new cover image or keep the existing one
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="cover">Cover Image</Label>
                <div className="mt-2">
                  <Input
                    id="cover"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="cursor-pointer"
                  />
                </div>
                {uploadingImage && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                )}
                {(coverUrl || album.coverUrl) && !uploadingImage && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                      {imageFileName
                        ? `✓ Image uploaded: ${imageFileName}`
                        : "Current image"}
                    </p>
                    <div className="relative w-full aspect-square rounded-md border border-border overflow-hidden">
                      <Image
                        src={coverUrl || album.coverUrl || "/placeholder.svg"}
                        alt="Album cover preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Album Details */}
          <Card>
            <CardHeader>
              <CardTitle>Album Details</CardTitle>
              <CardDescription>Update the album information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="releaseDate">Release Date</Label>
                <Input
                  id="releaseDate"
                  type="date"
                  value={formData.releaseDate}
                  onChange={(e) =>
                    setFormData({ ...formData, releaseDate: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={8}
                  className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter album description..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Songs in Album */}
        {album.songs && album.songs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Songs in Album ({album.songs.length})
              </CardTitle>
              <CardDescription>
                Songs that are currently linked to this album
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {album.songs.map((song: any) => (
                  <div
                    key={song.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{song.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {(song as any).artists?.map((sa: any) => sa.artist?.name).join(", ") ||
                         (song as any).artist?.name ||
                         "Unknown Artist"}
                        {song.genre && ` • ${song.genre.name}`}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/songs/${song.id}/edit`}>Edit</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center gap-4 justify-end">
          <Button type="submit" disabled={saving || uploadingImage}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/albums">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

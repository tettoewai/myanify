"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
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
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Artist {
  id: string;
  name: string;
  imageUrl: string | null;
  bio: string | null;
}

export default function EditArtistPage() {
  const router = useRouter();
  const params = useParams();
  const artistId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [artist, setArtist] = useState<Artist | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    bio: "",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  useEffect(() => {
    fetchArtist();
  }, [artistId]);

  const fetchArtist = async () => {
    try {
      const response = await fetch(`/api/artists/${artistId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch artist");
      }
      const data = await response.json();
      setArtist(data);
      setFormData({
        name: data.name,
        bio: data.bio || "",
      });
      setImageUrl(data.imageUrl || "");
    } catch (error) {
      console.error("Error fetching artist:", error);
      alert("Failed to load artist");
      router.push("/admin/artists");
    } finally {
      setLoading(false);
    }
  };

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
      setImageUrl(data.url);
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Failed to upload image file");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name) {
      alert("Please fill in the artist name");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/artists/${artistId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: imageUrl || null,
          bio: formData.bio || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update artist");
      }

      router.push("/admin/artists");
    } catch (error) {
      console.error("Error updating artist:", error);
      alert("Failed to update artist");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Loading artist...</div>;
  }

  if (!artist) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/artists">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Edit Artist</h2>
          <p className="text-muted-foreground mt-1">
            Update artist profile information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Artist Image
              </CardTitle>
              <CardDescription>
                Upload the artist profile image (JPG, PNG, WEBP)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="image">Profile Image</Label>
                <div className="mt-2">
                  <Input
                    id="image"
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
                {imageUrl && !uploadingImage && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                      {imageFileName ? `✓ Image uploaded: ${imageFileName}` : "Current image"}
                    </p>
                    <img
                      src={imageUrl}
                      alt="Artist preview"
                      className="w-32 h-32 rounded-full object-cover border border-border"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Artist Details */}
          <Card>
            <CardHeader>
              <CardTitle>Artist Details</CardTitle>
              <CardDescription>Enter the artist information</CardDescription>
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
                <Label htmlFor="bio">Biography</Label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) =>
                    setFormData({ ...formData, bio: e.target.value })
                  }
                  rows={8}
                  className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter artist biography..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center gap-4">
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
            <Link href="/admin/artists">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}


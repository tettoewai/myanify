"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
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
import { AdminFormPageSkeleton } from "@/components/loading-skeletons";
import { SeoFieldsCard } from "@/components/admin/seo-fields-card";
import { SlugInput } from "@/components/admin/slug-input";
import {
  clientSlugify,
  emptySeoFormValues,
  seoFormFromApi,
  seoFormToApi,
  type SeoFormValues,
} from "@/lib/seo-form";
import Link from "next/link";


interface Artist {
  id: string;
  name: string;
  englishName?: string | null;
  slug?: string;
  aliases?: string[];
  imageUrl: string | null;
  bio: string | null;
  englishBio?: string | null;
  country?: string | null;
  seo?: SeoFormValues | null;
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
    englishName: "",
    slug: "",
    aliases: "",
    bio: "",
    englishBio: "",
    country: "",
  });
  const [seoData, setSeoData] = useState<SeoFormValues>(emptySeoFormValues());
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
        englishName: data.englishName || "",
        slug: data.slug || "",
        aliases: (data.aliases || []).join(", "),
        bio: data.bio || "",
        englishBio: data.englishBio || "",
        country: data.country || "",
      });
      setSeoData(seoFormFromApi(data.seo));
      setImageUrl(data.imageUrl || "");
    } catch (error) {
      console.error("Error fetching artist:", error);
      toast.error("Failed to load artist");
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
      toast.success("Image uploaded successfully");
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
      toast.error("Please fill in the artist name");
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
          englishName: formData.englishName || null,
          englishBio: formData.englishBio || null,
          country: formData.country || null,
          aliases: formData.aliases,
          slug: formData.slug || null,
          seo: seoFormToApi(seoData),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update artist");
      }

      toast.success("Artist updated successfully");
      router.push("/admin/artists");
    } catch (error) {
      console.error("Error updating artist:", error);
      toast.error("Failed to update artist");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminFormPageSkeleton />;
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
                <Label htmlFor="englishName">English name</Label>
                <Input
                  id="englishName"
                  value={formData.englishName}
                  onChange={(e) =>
                    setFormData({ ...formData, englishName: e.target.value })
                  }
                  className="mt-2"
                />
              </div>

              <SlugInput
                value={formData.slug}
                onChange={(slug) => setFormData({ ...formData, slug })}
                onGenerate={() =>
                  setFormData({
                    ...formData,
                    slug: clientSlugify(
                      formData.englishName || formData.name,
                    ),
                  })
                }
              />

              <div>
                <Label htmlFor="aliases">Aliases</Label>
                <Input
                  id="aliases"
                  value={formData.aliases}
                  onChange={(e) =>
                    setFormData({ ...formData, aliases: e.target.value })
                  }
                  className="mt-2"
                  placeholder="Comma-separated alternate names"
                />
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) =>
                    setFormData({ ...formData, country: e.target.value })
                  }
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

              <div>
                <Label htmlFor="englishBio">English biography</Label>
                <textarea
                  id="englishBio"
                  value={formData.englishBio}
                  onChange={(e) =>
                    setFormData({ ...formData, englishBio: e.target.value })
                  }
                  rows={4}
                  className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="English biography for SEO..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <SeoFieldsCard values={seoData} onChange={setSeoData} />

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


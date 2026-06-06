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


interface Genre {
  id: string;
  name: string;
  imageUrl: string | null;
  description: string | null;
}

export default function EditGenrePage() {
  const router = useRouter();
  const params = useParams();
  const genreId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [genre, setGenre] = useState<Genre | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    englishName: "",
    slug: "",
    description: "",
    englishDescription: "",
  });
  const [seoData, setSeoData] = useState<SeoFormValues>(emptySeoFormValues());
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  useEffect(() => {
    fetchGenre();
  }, [genreId]);

  const fetchGenre = async () => {
    try {
      const response = await fetch(`/api/genres/${genreId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch genre");
      }
      const data = await response.json();
      setGenre(data);
      setFormData({
        name: data.name,
        englishName: data.englishName || "",
        slug: data.slug || "",
        description: data.description || "",
        englishDescription: data.englishDescription || "",
      });
      setSeoData(seoFormFromApi(data.seo));
      setImageUrl(data.imageUrl || "");
    } catch (error) {
      console.error("Error fetching genre:", error);
      toast.error("Failed to load genre");
      router.push("/admin/genres");
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
      toast.error("Please fill in the genre name");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/genres/${genreId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: imageUrl || null,
          description: formData.description || null,
          englishName: formData.englishName || null,
          englishDescription: formData.englishDescription || null,
          slug: formData.slug || null,
          seo: seoFormToApi(seoData),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update genre");
      }

      toast.success("Genre updated successfully");
      router.push("/admin/genres");
    } catch (error) {
      console.error("Error updating genre:", error);
      toast.error("Failed to update genre");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminFormPageSkeleton />;
  }

  if (!genre) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/genres">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Edit Genre</h2>
          <p className="text-muted-foreground mt-1">
            Update genre information
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
                Genre Image
              </CardTitle>
              <CardDescription>
                Upload the genre cover image (JPG, PNG, WEBP)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="image">Cover Image</Label>
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
                      alt="Genre preview"
                      className="w-full aspect-square rounded-md object-cover border border-border"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Genre Details */}
          <Card>
            <CardHeader>
              <CardTitle>Genre Details</CardTitle>
              <CardDescription>Enter the genre information</CardDescription>
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
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={8}
                  className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter genre description..."
                />
              </div>

              <div>
                <Label htmlFor="englishDescription">English description</Label>
                <textarea
                  id="englishDescription"
                  value={formData.englishDescription}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      englishDescription: e.target.value,
                    })
                  }
                  rows={4}
                  className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
            <Link href="/admin/genres">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}


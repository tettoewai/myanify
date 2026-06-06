"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Upload, Image as ImageIcon, Loader2 } from "lucide-react";
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
import Link from "next/link";
import { SeoFieldsCard } from "@/components/admin/seo-fields-card";
import { SlugInput } from "@/components/admin/slug-input";
import {
  clientSlugify,
  emptySeoFormValues,
  seoFormToApi,
  type SeoFormValues,
} from "@/lib/seo-form";


export default function NewArtistPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
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

    setLoading(true);

    try {
      const response = await fetch("/api/artists", {
        method: "POST",
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
        throw new Error("Failed to create artist");
      }

      toast.success("Artist created successfully");
      router.push("/admin/artists");
    } catch (error) {
      console.error("Error creating artist:", error);
      toast.error("Failed to create artist");
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-3xl font-bold text-foreground">Add New Artist</h2>
          <p className="text-muted-foreground mt-1">
            Create a new artist profile
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
                      ✓ Image uploaded: {imageFileName}
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

        <SeoFieldsCard values={seoData} onChange={setSeoData} />

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={loading || uploadingImage}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Artist"
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


"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AdminFormPageSkeleton } from "@/components/loading-skeletons";
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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Ad {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  linkUrl: string;
  sponsor: string;
  isActive: boolean;
  startDate: string;
  endDate: string | null;
}

export default function EditAdPage() {
  const router = useRouter();
  const params = useParams();
  const adId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [ad, setAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    linkUrl: "",
    sponsor: "",
    isActive: true,
    startDate: "",
    endDate: "",
  });
  const [imageUrl, setImageUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");

  useEffect(() => {
    fetchAd();
  }, [adId]);

  const fetchAd = async () => {
    try {
      const response = await fetch(`/api/ads/${adId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch ad");
      }
      const data = await response.json();
      setAd(data);
      setFormData({
        title: data.title,
        description: data.description || "",
        linkUrl: data.linkUrl,
        sponsor: data.sponsor,
        isActive: data.isActive,
        startDate: new Date(data.startDate).toISOString().split("T")[0],
        endDate: data.endDate
          ? new Date(data.endDate).toISOString().split("T")[0]
          : "",
      });
      setImageUrl(data.imageUrl || "");
    } catch (error) {
      console.error("Error fetching ad:", error);
      toast.error("Failed to load ad");
      router.push("/admin/ads");
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

    if (!formData.title || !formData.linkUrl || !formData.sponsor) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/ads/${adId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          imageUrl: imageUrl || null,
          description: formData.description || null,
          endDate: formData.endDate || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update ad");
      }

      toast.success("Ad updated successfully");
      router.push("/admin/ads");
    } catch (error) {
      console.error("Error updating ad:", error);
      alert("Failed to update ad");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <AdminFormPageSkeleton />;
  }

  if (!ad) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/ads">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Edit Ad</h2>
          <p className="text-muted-foreground mt-1">
            Update advertisement information
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
                Ad Image
              </CardTitle>
              <CardDescription>
                Upload the advertisement image (JPG, PNG, WEBP)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="image">Ad Image</Label>
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
                      alt="Ad preview"
                      className="w-full aspect-video rounded-md object-cover border border-border"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Ad Details */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Details</CardTitle>
              <CardDescription>Enter the advertisement information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
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
                  rows={4}
                  className="mt-2 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Enter ad description..."
                />
              </div>

              <div>
                <Label htmlFor="linkUrl">Link URL *</Label>
                <Input
                  id="linkUrl"
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, linkUrl: e.target.value })
                  }
                  required
                  placeholder="https://example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="sponsor">Sponsor *</Label>
                <Input
                  id="sponsor"
                  value={formData.sponsor}
                  onChange={(e) =>
                    setFormData({ ...formData, sponsor: e.target.value })
                  }
                  required
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
            <CardDescription>Set dates and active status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  className="mt-2"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    isActive: checked === true,
                  })
                }
              />
              <Label
                htmlFor="isActive"
                className="text-sm font-normal cursor-pointer"
              >
                Active
              </Label>
            </div>
          </CardContent>
        </Card>

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
            <Link href="/admin/ads">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}


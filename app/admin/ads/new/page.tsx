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
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";


export default function NewAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    linkUrl: "",
    sponsor: "",
    isActive: true,
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
  });
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

    if (!formData.title || !formData.linkUrl || !formData.sponsor) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/ads", {
        method: "POST",
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
        throw new Error("Failed to create ad");
      }

      toast.success("Ad created successfully");
      router.push("/admin/ads");
    } catch (error) {
      console.error("Error creating ad:", error);
      toast.error("Failed to create ad");
    } finally {
      setLoading(false);
    }
  };

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
          <h2 className="text-3xl font-bold text-foreground">Add New Ad</h2>
          <p className="text-muted-foreground mt-1">
            Create a new advertisement
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
                      ✓ Image uploaded: {imageFileName}
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
          <Button type="submit" disabled={loading || uploadingImage}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Ad"
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


"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useArtists, useGenres, useAlbums } from "@/lib/swr";
import { toast } from "sonner";
import {
  ArrowLeft,
  Upload,
  Music,
  Image as ImageIcon,
  Loader2,
  FileText,
} from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Artist {
  id: string;
  name: string;
}

interface Genre {
  id: string;
  name: string;
}

interface Album {
  id: string;
  name: string;
}

export default function NewSongPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLyrics, setUploadingLyrics] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    duration: 0, // Duration in seconds
    artistId: "",
    genreId: "",
    albumId: "",
    isPremium: false,
    isPublished: false,
  });
  const [audioUrl, setAudioUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [lyricsData, setLyricsData] = useState<any[]>([]);
  const [audioFileName, setAudioFileName] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [lyricsFileName, setLyricsFileName] = useState("");

  const { artists: fetchedArtists } = useArtists();
  const { genres: fetchedGenres } = useGenres();
  const { albums: fetchedAlbums } = useAlbums();

  // Use fetched data directly instead of storing in state to avoid infinite loops
  const artists = fetchedArtists || [];
  const genres = fetchedGenres || [];
  const albums = fetchedAlbums || [];

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.addEventListener("loadedmetadata", () => {
        URL.revokeObjectURL(url);
        resolve(Math.round(audio.duration));
      });

      audio.addEventListener("error", (e) => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load audio metadata"));
      });

      audio.src = url;
    });
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAudio(true);
    setAudioFileName(file.name);

    try {
      // Get duration from audio file
      const duration = await getAudioDuration(file);
      setFormData((prev) => ({ ...prev, duration }));

      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "audio");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload audio");
      }

      const data = await response.json();
      setAudioUrl(data.url);
      toast.success("Audio file uploaded successfully");
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast.error("Failed to upload audio file");
    } finally {
      setUploadingAudio(false);
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
      setCoverUrl(data.url);
      toast.success("Cover image uploaded successfully");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image file");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLyricsUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLyrics(true);
    setLyricsFileName(file.name);

    try {
      // Read file content
      const text = await file.text();

      // Parse lyrics
      const { parseLRC, parsePlainText } = await import("@/lib/lyric-parser");
      const parsedLyrics = file.name.endsWith(".lrc")
        ? parseLRC(text)
        : parsePlainText(text, formData.duration || 180);

      if (parsedLyrics.length === 0) {
        throw new Error("No lyrics found in file");
      }

      setLyricsData(parsedLyrics);
      toast.success(`Lyrics uploaded successfully (${parsedLyrics.length} lines)`);
    } catch (error) {
      console.error("Error uploading lyrics:", error);
      toast.error("Failed to upload lyrics file");
      setLyricsData([]);
      setLyricsFileName("");
    } finally {
      setUploadingLyrics(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!audioUrl) {
      toast.error("Please upload an audio file");
      return;
    }

    if (!formData.title || !formData.artistId) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.duration || formData.duration <= 0) {
      toast.error("Please upload an audio file to get the duration");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/songs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          duration: formData.duration, // Already in seconds
          audioUrl,
          coverUrl: coverUrl || null,
          genreId: formData.genreId || null,
          albumId: formData.albumId || null,
          lyrics: lyricsData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create song");
      }

      toast.success("Song created successfully");
      router.push("/admin/songs");
    } catch (error) {
      console.error("Error creating song:", error);
      toast.error("Failed to create song");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/admin/songs">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-bold text-foreground">Add New Song</h2>
          <p className="text-muted-foreground mt-1">
            Upload audio and cover image to create a new song
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Audio Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="w-5 h-5" />
                Audio File
              </CardTitle>
              <CardDescription>
                Upload the song audio file (MP3, WAV, M4A, FLAC, OGG)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="audio">Audio File *</Label>
                <div className="mt-2">
                  <Input
                    id="audio"
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioUpload}
                    disabled={uploadingAudio}
                    className="cursor-pointer"
                  />
                </div>
                {uploadingAudio && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                )}
                {audioUrl && !uploadingAudio && (
                  <p className="mt-2 text-sm text-green-600 dark:text-green-400">
                    ✓ Audio uploaded: {audioFileName}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cover Image Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Cover Image
              </CardTitle>
              <CardDescription>
                Upload the song cover image (JPG, PNG, WEBP). If not provided,
                the album cover will be used if the song is assigned to an
                album.
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
                {coverUrl && !uploadingImage && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                      ✓ Image uploaded: {imageFileName}
                    </p>
                    <Image
                      src={coverUrl}
                      alt="Cover preview"
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-md object-cover border border-border"
                      unoptimized
                    />
                  </div>
                )}
                {!coverUrl &&
                  formData.albumId &&
                  formData.albumId !== "none" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      No cover image uploaded. The album cover will be used as
                      fallback.
                    </p>
                  )}
              </div>
            </CardContent>
          </Card>

          {/* Lyrics Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Lyrics File
              </CardTitle>
              <CardDescription>
                Upload lyrics file (LRC or TXT format)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="lyrics">Lyrics File</Label>
                <div className="mt-2">
                  <Input
                    id="lyrics"
                    type="file"
                    accept=".lrc,.txt"
                    onChange={handleLyricsUpload}
                    disabled={uploadingLyrics}
                    className="cursor-pointer"
                  />
                </div>
                {uploadingLyrics && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Uploading...
                  </div>
                )}
                {lyricsData.length > 0 && !uploadingLyrics && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                      ✓ Lyrics uploaded: {lyricsFileName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lyricsData.length} lines parsed
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Song Details */}
        <Card>
          <CardHeader>
            <CardTitle>Song Details</CardTitle>
            <CardDescription>Enter the song information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
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
              <div className="col-span-1">
                <Label htmlFor="artistId">Artist *</Label>
                <Select
                  value={formData.artistId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, artistId: value })
                  }
                  required
                >
                  <SelectTrigger className="mt-2" id="artistId">
                    <SelectValue placeholder="Select an artist" />
                  </SelectTrigger>
                  <SelectContent>
                    {artists.map((artist) => (
                      <SelectItem key={artist.id} value={artist.id}>
                        {artist.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="genreId">Genre</Label>
                <Select
                  value={formData.genreId || undefined}
                  onValueChange={(value) =>
                    setFormData({ ...formData, genreId: value || "" })
                  }
                >
                  <SelectTrigger className="mt-2" id="genreId">
                    <SelectValue placeholder="Select a genre" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre.id} value={genre.id}>
                        {genre.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="albumId">Album</Label>
                <Select
                  value={formData.albumId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      albumId: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger className="mt-2" id="albumId">
                    <SelectValue placeholder="Select an album (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {albums.map((album) => (
                      <SelectItem key={album.id} value={album.id}>
                        {album.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPremium"
                  checked={formData.isPremium}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isPremium: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor="isPremium"
                  className="text-sm font-normal cursor-pointer"
                >
                  Premium Song
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="isPublished"
                  checked={formData.isPublished}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      isPublished: checked === true,
                    })
                  }
                />
                <Label
                  htmlFor="isPublished"
                  className="text-sm font-normal cursor-pointer"
                >
                  Publish Immediately
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 justify-end">
          <Button
            type="submit"
            disabled={
              loading || uploadingAudio || uploadingImage || uploadingLyrics
            }
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Song"
            )}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/songs">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

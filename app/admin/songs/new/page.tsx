"use client";

import { SeoFieldsCard } from "@/components/admin/seo-fields-card";
import { SlugInput } from "@/components/admin/slug-input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArtistCombobox } from "@/components/admin/artist-combobox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAlbumWithType, type AlbumType } from "@/lib/album-type";
import { SONG_MOODS } from "@/lib/song-meta";
import { uploadAudioFile } from "@/lib/audio-upload-client";
import { formatMaxAudioSize } from "@/lib/audio-upload-config";
import {
  clientSlugify,
  emptySeoFormValues,
  seoFormToApi,
  type SeoFormValues,
} from "@/lib/seo-form";
import { useAlbums, useArtists, useGenres } from "@/lib/swr";
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Loader2,
  Music,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function NewSongPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLyrics, setUploadingLyrics] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    englishTitle: "",
    slug: "",
    description: "",
    englishDescription: "",
    alternativeTitles: "",
    language: "my",
    releaseDate: "",
    duration: 0,
    artistIds: [] as string[],
    genreId: "",
    albumId: "",
    mood: "",
    tags: "",
    isPremium: false,
    isPublished: false,
  });
  const [seoData, setSeoData] = useState<SeoFormValues>(emptySeoFormValues());
  const [audioUrl, setAudioUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [lyricsData, setLyricsData] = useState<any[]>([]);
  const [audioFileName, setAudioFileName] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [lyricsFileName, setLyricsFileName] = useState("");
  const [songRequestId, setSongRequestId] = useState<string | null>(null);

  const { artists: fetchedArtists } = useArtists();
  const { genres: fetchedGenres } = useGenres();
  const { albums: fetchedAlbums } = useAlbums();

  // Use fetched data directly instead of storing in state to avoid infinite loops
  const artists = fetchedArtists || [];
  const genres = fetchedGenres || [];
  const albums = fetchedAlbums || [];

  // Pre-fill from song request query params
  useEffect(() => {
    const title = searchParams.get("title");
    const artist = searchParams.get("artist");
    const requestId = searchParams.get("songRequest");
    if (title) {
      setFormData((prev) => ({ ...prev, title }));
    }
    if (requestId) {
      setSongRequestId(requestId);
    }
    // Artist pre-fill is handled via the ArtistCombobox below
  }, [searchParams]);

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
      const duration = await getAudioDuration(file);
      setFormData((prev) => ({ ...prev, duration }));

      const result = await uploadAudioFile(file);
      setAudioUrl(result.url);
      toast.success(
        `Audio uploaded (${Math.round(result.fileSize / 1024)} KB compressed MP3)`,
      );
    } catch (error) {
      console.error("Error uploading audio:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload audio file",
      );
    } finally {
      setUploadingAudio(false);
      e.target.value = "";
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
      toast.success(
        `Lyrics uploaded successfully (${parsedLyrics.length} lines)`,
      );
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

    if (!formData.title || formData.artistIds.length === 0) {
      toast.error(
        "Please fill in all required fields and select at least one artist",
      );
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
          artistIds: formData.artistIds,
          duration: formData.duration,
          audioUrl,
          coverUrl: coverUrl || null,
          genreId: formData.genreId || null,
          albumId: formData.albumId || null,
          englishTitle: formData.englishTitle || null,
          slug: formData.slug || null,
          description: formData.description || null,
          englishDescription: formData.englishDescription || null,
          alternativeTitles: formData.alternativeTitles,
          language: formData.language || "my",
          releaseDate: formData.releaseDate || null,
          mood: formData.mood || null,
          tags: formData.tags,
          seo: seoFormToApi(seoData),
          lyrics: lyricsData,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create song");
      }

      // If this song was created from a song request, mark it as approved
      if (songRequestId) {
        try {
          await fetch(`/api/song-requests/${songRequestId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "APPROVED" }),
          });
        } catch (e) {
          console.error("Failed to mark song request as approved:", e);
        }
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
    <div className="w-full max-w-full overflow-hidden">
      <div className="space-y-6 px-4 md:px-6">
        <div className="flex items-center gap-4 flex-wrap">
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

        <form onSubmit={handleSubmit} className="space-y-6 w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
            {/* Audio Upload */}
            <Card className="w-full min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Music className="w-5 h-5 flex-shrink-0" />
                  Audio File
                </CardTitle>
                <CardDescription className="text-sm">
                  Upload the song audio file (MP3, WAV, M4A, FLAC, OGG). Files
                  are compressed to 128kbps MP3. Max {formatMaxAudioSize()}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full">
                  <Label htmlFor="audio">Audio File *</Label>
                  <div className="mt-2 w-full">
                    <Input
                      id="audio"
                      type="file"
                      accept="audio/*"
                      onChange={handleAudioUpload}
                      disabled={uploadingAudio}
                      className="cursor-pointer w-full"
                    />
                  </div>
                  {uploadingAudio && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      Uploading...
                    </div>
                  )}
                  {audioUrl && !uploadingAudio && (
                    <p className="mt-2 text-sm text-green-600 dark:text-green-400 break-all">
                      ✓ Audio uploaded: {audioFileName}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Cover Image Upload */}
            <Card className="w-full min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <ImageIcon className="w-5 h-5 flex-shrink-0" />
                  Cover Image
                </CardTitle>
                <CardDescription className="text-sm">
                  Upload the song cover image (JPG, PNG, WEBP). If not provided,
                  the album cover will be used if the song is assigned to an
                  album.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full">
                  <Label htmlFor="cover">Cover Image</Label>
                  <div className="mt-2 w-full">
                    <Input
                      id="cover"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      className="cursor-pointer w-full"
                    />
                  </div>
                  {uploadingImage && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      Uploading...
                    </div>
                  )}
                  {coverUrl && !uploadingImage && (
                    <div className="mt-4">
                      <p className="text-sm text-green-600 dark:text-green-400 mb-2 break-all">
                        ✓ Image uploaded: {imageFileName}
                      </p>
                      <Image
                        src={coverUrl}
                        alt="Cover preview"
                        width={128}
                        height={128}
                        className="w-32 h-32 rounded-md object-cover border border-border flex-shrink-0"
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
            <Card className="w-full min-w-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <FileText className="w-5 h-5 flex-shrink-0" />
                  Lyrics File
                </CardTitle>
                <CardDescription className="text-sm">
                  Upload lyrics file (LRC or TXT format)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full">
                  <Label htmlFor="lyrics">Lyrics File</Label>
                  <div className="mt-2 w-full">
                    <Input
                      id="lyrics"
                      type="file"
                      accept=".lrc,.txt"
                      onChange={handleLyricsUpload}
                      disabled={uploadingLyrics}
                      className="cursor-pointer w-full"
                    />
                  </div>
                  {uploadingLyrics && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
                      Uploading...
                    </div>
                  )}
                  {lyricsData.length > 0 && !uploadingLyrics && (
                    <div className="mt-4">
                      <p className="text-sm text-green-600 dark:text-green-400 mb-2 break-all">
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
          <Card className="w-full min-w-0">
            <CardHeader>
              <CardTitle>Song Details</CardTitle>
              <CardDescription>Enter the song information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-1 min-w-0">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    required
                    className="mt-2 w-full"
                  />
                </div>
                <div className="col-span-1 min-w-0">
                  <Label htmlFor="englishTitle">English title</Label>
                  <Input
                    id="englishTitle"
                    value={formData.englishTitle}
                    onChange={(e) =>
                      setFormData({ ...formData, englishTitle: e.target.value })
                    }
                    className="mt-2 w-full"
                  />
                </div>
              </div>

              <SlugInput
                value={formData.slug}
                onChange={(slug) => setFormData({ ...formData, slug })}
                onGenerate={() =>
                  setFormData({
                    ...formData,
                    slug: clientSlugify(
                      formData.englishTitle || formData.title,
                    ),
                  })
                }
              />

              <div className="w-full">
                <Label htmlFor="artists">Artists *</Label>
                <div className="mt-2 w-full">
                  <ArtistCombobox
                    value={formData.artistIds}
                    onChange={(selectedIds) =>
                      setFormData({ ...formData, artistIds: selectedIds })
                    }
                    placeholder="Select artists..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <Label htmlFor="genreId">Genre</Label>
                  <Select
                    value={formData.genreId || undefined}
                    onValueChange={(value) =>
                      setFormData({ ...formData, genreId: value || "" })
                    }
                  >
                    <SelectTrigger className="mt-2 w-full" id="genreId">
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

                <div className="min-w-0">
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
                    <SelectTrigger className="mt-2 w-full" id="albumId">
                      <SelectValue placeholder="Select an album (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {albums.map(
                        (album: {
                          id: string;
                          name: string;
                          type?: AlbumType;
                        }) => (
                          <SelectItem key={album.id} value={album.id}>
                            {formatAlbumWithType(album.name, album.type)}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <Label htmlFor="mood">Mood (for recommendations)</Label>
                  <Select
                    value={formData.mood || "none"}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        mood: value === "none" ? "" : value,
                      })
                    }
                  >
                    <SelectTrigger className="mt-2 w-full" id="mood">
                      <SelectValue placeholder="Select a mood (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {SONG_MOODS.map((mood) => (
                        <SelectItem key={mood} value={mood}>
                          {mood.charAt(0).toUpperCase() + mood.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-0">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) =>
                      setFormData({ ...formData, tags: e.target.value })
                    }
                    placeholder="e.g. acoustic, live, workout"
                    className="mt-2 w-full"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 flex-wrap">
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

          <SeoFieldsCard values={seoData} onChange={setSeoData} />

          <div className="flex items-center gap-4 justify-end flex-wrap">
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
    </div>
  );
}

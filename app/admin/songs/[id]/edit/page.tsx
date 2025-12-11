"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useArtists, useGenres, useAlbums, useSong } from "@/lib/swr";
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

interface Song {
  id: string;
  title: string;
  duration: number;
  audioUrl: string;
  coverUrl: string | null;
  artistId: string;
  genreId: string | null;
  albumId: string | null;
  isPremium: boolean;
  isPublished: boolean;
}

export default function EditSongPage() {
  const router = useRouter();
  const params = useParams();
  const songId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLyrics, setUploadingLyrics] = useState(false);
  // Use fetched data directly instead of storing in state to avoid infinite loops
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
  const initializedSongIdRef = useRef<string | null>(null);

  const { song, isLoading: songLoading } = useSong(songId, true); // Use admin mode to get raw data
  const { artists: fetchedArtists } = useArtists();
  const { genres: fetchedGenres } = useGenres();
  const { albums: fetchedAlbums } = useAlbums();

  // Reset when songId changes
  useEffect(() => {
    initializedSongIdRef.current = null;
    setLoading(true);
    // Reset form data
    setFormData({
      title: "",
      duration: 0,
      artistId: "",
      genreId: "",
      albumId: "",
      isPremium: false,
      isPublished: false,
    });
    setAudioUrl("");
    setCoverUrl("");
    setLyricsData([]);
  }, [songId]);

  // Use useMemo to determine if we should initialize (only recomputes when deps change)
  const shouldInitialize = useMemo(() => {
    // Don't initialize if already done
    if (initializedSongIdRef.current === songId) {
      return false;
    }
    // Don't initialize if still loading
    if (songLoading) {
      return false;
    }
    // Initialize if we have valid song data
    return !!(song && song.id === songId);
  }, [songId, songLoading, song?.id]);

  // Single effect that only runs when shouldInitialize changes
  useEffect(() => {
    if (!shouldInitialize) {
      // Handle error case separately
      if (!songLoading && !song && initializedSongIdRef.current !== songId) {
        toast.error("Failed to load song");
        router.push("/admin/songs");
      }
      return;
    }

    // Mark as initialized FIRST to prevent re-runs
    initializedSongIdRef.current = songId;

    // Then update all state (song is guaranteed to exist here due to shouldInitialize check)
    if (song && song.id === songId) {
      setFormData({
        title: song.title,
        duration: song.duration,
        artistId: song.artistId,
        genreId: song.genreId || "",
        albumId: song.albumId || "",
        isPremium: song.isPremium,
        isPublished: song.isPublished,
      });
      setAudioUrl(song.audioUrl);
      setCoverUrl(song.coverUrl || "");
      setLyricsData((song as any).lyrics || []);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldInitialize]); // Only depend on the computed flag

  // Use fetched data directly - no need to store in state
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

    setSaving(true);

    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
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
          lyrics: lyricsData.length > 0 ? lyricsData : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update song");
      }

      toast.success("Song updated successfully");
      router.push("/admin/songs");
    } catch (error) {
      console.error("Error updating song:", error);
      toast.error("Failed to update song");
    } finally {
      setSaving(false);
    }
  };

  if (loading || songLoading) {
    return <div className="text-center py-12">Loading song...</div>;
  }

  if (!song) {
    return <div className="text-center py-12">Song not found</div>;
  }

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
          <h2 className="text-3xl font-bold text-foreground">Edit Song</h2>
          <p className="text-muted-foreground mt-1">
            Update song details and upload new files
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
                Upload a new audio file or keep the existing one
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
                    {audioFileName
                      ? `✓ Audio uploaded: ${audioFileName}`
                      : "✓ Using existing audio file"}
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
                Upload a new cover image or keep the existing one. If not
                provided, the album cover will be used if the song is assigned
                to an album.
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
                {(coverUrl || song.coverUrl) && !uploadingImage && (
                  <div className="mt-4">
                    <p className="text-sm text-green-600 dark:text-green-400 mb-2">
                      {imageFileName
                        ? `✓ Image uploaded: ${imageFileName}`
                        : "✓ Using existing cover image"}
                    </p>
                    <Image
                      src={coverUrl || song.coverUrl || "/placeholder.svg"}
                      alt="Cover preview"
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-md object-cover border border-border"
                      unoptimized
                    />
                  </div>
                )}
                {!coverUrl &&
                  !song.coverUrl &&
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
                      {lyricsFileName
                        ? `✓ Lyrics uploaded: ${lyricsFileName}`
                        : "✓ Using existing lyrics"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lyricsData.length} lines
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
            <CardDescription>Update the song information</CardDescription>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
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
                  Published
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-4 justify-end">
          <Button
            type="submit"
            disabled={
              saving || uploadingAudio || uploadingImage || uploadingLyrics
            }
          >
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
            <Link href="/admin/songs">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}

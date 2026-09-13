"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Music,
  FilterX,
  Download,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { AdminListPageSkeleton } from "@/components/loading-skeletons";
import { useAdminSongs, useGenres } from "@/lib/swr";
import { ADMIN_PAGE_SIZE } from "@/lib/pagination";
import { mutate } from "swr";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

interface AdminSong {
  id: string;
  title: string;
  englishTitle: string | null;
  coverUrl: string | null;
  duration: number;
  playCount: number;
  isPremium: boolean;
  isPublished: boolean;
  releaseDate: string | null;
  createdAt: string;
  artists: { artist: { id: string; name: string } }[];
  album: { id: string; name: string; coverUrl?: string | null } | null;
  genre: { id: string; name: string } | null;
  _count?: { likedBy: number; playHistory: number };
}

type FilterStatus = "all" | "published" | "draft";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "popular", label: "Most played" },
  { value: "title", label: "Title A–Z" },
];

function parsePageParam(value: string | null) {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function pickStatus(value: string | null): FilterStatus {
  return value === "published" || value === "draft" ? value : "all";
}

function pickPremium(value: string | null) {
  return value === "premium" || value === "free" ? value : "all";
}

function pickSort(value: string | null) {
  return SORT_OPTIONS.some((o) => o.value === value) ? value! : "newest";
}

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function artistNames(song: AdminSong) {
  const names = song.artists
    .map((a) => a.artist?.name)
    .filter(Boolean) as string[];
  return names.length > 0 ? names.join(", ") : "Unknown Artist";
}

function coverSrc(song: AdminSong) {
  return song.coverUrl || song.album?.coverUrl || "/placeholder.svg";
}

function exportCsv(songs: AdminSong[]) {
  const header = [
    "id",
    "title",
    "artists",
    "genre",
    "album",
    "duration",
    "plays",
    "likes",
    "premium",
    "status",
    "releaseDate",
  ];
  const rows = songs.map((s) =>
    [
      s.id,
      s.title,
      artistNames(s),
      s.genre?.name ?? "",
      s.album?.name ?? "",
      s.duration,
      s.playCount ?? 0,
      s._count?.likedBy ?? 0,
      s.isPremium ? "yes" : "no",
      s.isPublished ? "published" : "draft",
      s.releaseDate ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const blob = new Blob([[header.join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `myanify-songs-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SongsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") ?? ""
  );
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(() =>
    pickStatus(searchParams.get("status"))
  );
  const [premiumFilter, setPremiumFilter] = useState(() =>
    pickPremium(searchParams.get("premium"))
  );
  const [genreFilter, setGenreFilter] = useState(
    () => searchParams.get("genreId") ?? "all"
  );
  const [sort, setSort] = useState(() => pickSort(searchParams.get("sort")));
  const [artistId, setArtistId] = useState(
    () => searchParams.get("artistId") ?? ""
  );
  const [artistName, setArtistName] = useState(
    () => searchParams.get("artistName") ?? ""
  );
  const [albumId, setAlbumId] = useState(() => searchParams.get("albumId") ?? "");
  const [albumName, setAlbumName] = useState(
    () => searchParams.get("albumName") ?? ""
  );

  const [songToDelete, setSongToDelete] = useState<AdminSong | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Keep URL in sync (shareable, survives refresh)
  const lastPushedParamsRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    if (filterStatus !== "all") params.set("status", filterStatus);
    if (premiumFilter !== "all") params.set("premium", premiumFilter);
    if (genreFilter !== "all") params.set("genreId", genreFilter);
    if (sort !== "newest") params.set("sort", sort);
    if (artistId) {
      params.set("artistId", artistId);
      if (artistName) params.set("artistName", artistName);
    }
    if (albumId) {
      params.set("albumId", albumId);
      if (albumName) params.set("albumName", albumName);
    }
    if (page > 1) params.set("page", String(page));
    const key = params.toString();
    if (key !== searchParams.toString()) {
      lastPushedParamsRef.current = key;
      router.replace(key ? `${pathname}?${key}` : pathname, { scroll: false });
    }
  }, [
    debouncedSearchQuery,
    filterStatus,
    premiumFilter,
    genreFilter,
    sort,
    artistId,
    artistName,
    albumId,
    albumName,
    page,
    pathname,
    router,
    searchParams,
  ]);

  // Restore state on browser back/forward
  useEffect(() => {
    const key = searchParams.toString();
    if (lastPushedParamsRef.current === key) {
      lastPushedParamsRef.current = null;
      return;
    }
    setPage(parsePageParam(searchParams.get("page")));
    const nextSearch = searchParams.get("search") ?? "";
    setSearchQuery((prev) => (prev === nextSearch ? prev : nextSearch));
    const nextStatus = pickStatus(searchParams.get("status"));
    setFilterStatus((prev) => (prev === nextStatus ? prev : nextStatus));
    const nextPremium = pickPremium(searchParams.get("premium"));
    setPremiumFilter((prev) => (prev === nextPremium ? prev : nextPremium));
    const nextGenre = searchParams.get("genreId") ?? "all";
    setGenreFilter((prev) => (prev === nextGenre ? prev : nextGenre));
    const nextSort = pickSort(searchParams.get("sort"));
    setSort((prev) => (prev === nextSort ? prev : nextSort));
    const nextArtistId = searchParams.get("artistId") ?? "";
    setArtistId((prev) => (prev === nextArtistId ? prev : nextArtistId));
    const nextArtistName = searchParams.get("artistName") ?? "";
    setArtistName((prev) => (prev === nextArtistName ? prev : nextArtistName));
    const nextAlbumId = searchParams.get("albumId") ?? "";
    setAlbumId((prev) => (prev === nextAlbumId ? prev : nextAlbumId));
    const nextAlbumName = searchParams.get("albumName") ?? "";
    setAlbumName((prev) => (prev === nextAlbumName ? prev : nextAlbumName));
  }, [searchParams]);

  const isPublishedParam =
    filterStatus === "all"
      ? undefined
      : filterStatus === "published"
        ? true
        : false;

  const {
    songs,
    pagination,
    isLoading,
    mutate: mutateSongs,
  } = useAdminSongs({
    isPublished: isPublishedParam,
    isPremium:
      premiumFilter === "all" ? undefined : premiumFilter === "premium",
    genreId: genreFilter === "all" ? undefined : genreFilter,
    artistId: artistId || undefined,
    albumId: albumId || undefined,
    sort: sort === "newest" ? undefined : sort,
    search: debouncedSearchQuery || undefined,
    page,
    limit: ADMIN_PAGE_SIZE,
  });

  const { genres } = useGenres({ limit: 100 });

  const typedSongs = songs as AdminSong[];

  const hasActiveFilters =
    Boolean(debouncedSearchQuery) ||
    filterStatus !== "all" ||
    premiumFilter !== "all" ||
    genreFilter !== "all" ||
    artistId !== "" ||
    albumId !== "";

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleStatusChange = (value: FilterStatus) => {
    setFilterStatus(value);
    setPage(1);
  };

  const handlePremiumChange = (value: string) => {
    setPremiumFilter(value);
    setPage(1);
  };

  const handleGenreChange = (value: string) => {
    setGenreFilter(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const clearScope = (scope: "artist" | "album") => {
    if (scope === "artist") {
      setArtistId("");
      setArtistName("");
    } else {
      setAlbumId("");
      setAlbumName("");
    }
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setPremiumFilter("all");
    setGenreFilter("all");
    setSort("newest");
    setArtistId("");
    setArtistName("");
    setAlbumId("");
    setAlbumName("");
    setPage(1);
  };

  const togglePublish = async (songId: string, currentStatus: boolean) => {
    setTogglingId(songId);
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !currentStatus }),
      });

      if (response.ok) {
        toast.success(
          `Song ${!currentStatus ? "published" : "unpublished"} successfully`,
        );
        mutateSongs();
        mutate(`/api/songs?isPublished=${!currentStatus}`);
        mutate(`/api/songs?isPublished=${currentStatus}`);
        mutate("/api/songs");
      } else {
        const payload = await response.json().catch(() => null);
        toast.error(payload?.error || "Failed to update publish status");
      }
    } catch (error) {
      console.error("Error toggling publish status:", error);
      toast.error("Failed to update publish status");
    } finally {
      setTogglingId(null);
    }
  };

  const deleteSong = async (songId: string) => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/songs/${songId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Song deleted successfully");
        mutateSongs();
        mutate("/api/songs");
        mutate("/api/songs?isPublished=true");
        mutate("/api/songs?isPublished=false");
      } else {
        const payload = await response.json().catch(() => null);
        toast.error(payload?.error || "Failed to delete song");
      }
    } catch (error) {
      console.error("Error deleting song:", error);
      toast.error("Failed to delete song");
    } finally {
      setDeleting(false);
      setSongToDelete(null);
    }
  };

  const StatusButton = ({
    label,
    value,
  }: {
    label: string;
    value: FilterStatus;
  }) => (
    <Button
      variant={filterStatus === value ? "default" : "outline"}
      size="sm"
      onClick={() => handleStatusChange(value)}
    >
      {label}
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Songs</h2>
          <p className="text-muted-foreground mt-1">
            Manage all songs in your library
            {pagination ? ` · ${pagination.total.toLocaleString()} total` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportCsv(typedSongs)}
            disabled={typedSongs.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
          <Button size="sm" asChild>
            <Link href="/admin/songs/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Song
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search songs..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-8"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-lg leading-none"
                aria-label="Clear search"
              >
                ×
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusButton label="All" value="all" />
            <StatusButton label="Published" value="published" />
            <StatusButton label="Drafts" value="draft" />
            <Select value={premiumFilter} onValueChange={handlePremiumChange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Access" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All access</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="free">Free</SelectItem>
              </SelectContent>
            </Select>
            <Select value={genreFilter} onValueChange={handleGenreChange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All genres</SelectItem>
                {genres.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <FilterX className="w-4 h-4 mr-1.5" />
                Clear
              </Button>
            )}
          </div>
        </div>
        {(artistId || albumId) && (
          <div className="flex flex-wrap gap-2">
            {artistId && (
              <Badge variant="secondary" className="gap-1.5 py-1 pl-3">
                Artist: {artistName || artistId}
                <button
                  onClick={() => clearScope("artist")}
                  aria-label="Clear artist filter"
                  className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
            {albumId && (
              <Badge variant="secondary" className="gap-1.5 py-1 pl-3">
                Album: {albumName || albumId}
                <button
                  onClick={() => clearScope("album")}
                  aria-label="Clear album filter"
                  className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {isLoading && songs.length === 0 ? (
          <AdminListPageSkeleton withSearch={false} />
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-4 text-sm font-medium">Cover</th>
                <th className="text-left p-4 text-sm font-medium min-w-[200px]">Title</th>
                <th className="text-left p-4 text-sm font-medium">Artist</th>
                <th className="text-left p-4 text-sm font-medium hidden lg:table-cell">Album</th>
                <th className="text-left p-4 text-sm font-medium hidden md:table-cell">Genre</th>
                <th className="text-left p-4 text-sm font-medium">Duration</th>
                <th className="text-left p-4 text-sm font-medium">Plays</th>
                <th className="text-left p-4 text-sm font-medium hidden xl:table-cell">Likes</th>
                <th className="text-left p-4 text-sm font-medium">Status</th>
                <th className="text-left p-4 text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {typedSongs.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-8 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-3 py-8">
                      <Music className="w-10 h-10 text-muted-foreground/50" />
                      <p>
                        {hasActiveFilters
                          ? "No songs match your filters"
                          : "No songs found"}
                      </p>
                      {hasActiveFilters ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={resetFilters}
                        >
                          Clear all filters
                        </Button>
                      ) : (
                        <Button size="sm" asChild>
                          <Link href="/admin/songs/new">
                            <Plus className="w-4 h-4 mr-2" />
                            Add your first song
                          </Link>
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                typedSongs.map((song) => {
                  const releaseYear = song.releaseDate
                    ? new Date(song.releaseDate).getFullYear()
                    : null;
                  return (
                  <tr
                    key={song.id}
                    className="border-t border-border hover:bg-muted/30"
                  >
                    <td className="p-4">
                      <Image
                        src={coverSrc(song)}
                        alt={song.title}
                        width={48}
                        height={48}
                        className="w-12 h-12 rounded-md object-cover"
                        unoptimized
                      />
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="font-medium line-clamp-1" title={song.title}>
                          {song.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {song.englishTitle &&
                            song.englishTitle !== song.title && (
                              <span className="text-xs text-muted-foreground truncate max-w-[140px]">
                                {song.englishTitle}
                              </span>
                            )}
                          {song.isPremium && (
                            <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                              Premium
                            </span>
                          )}
                          {releaseYear && (
                            <span className="text-[11px] text-muted-foreground">
                              · {releaseYear}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground max-w-[160px]">
                      <span className="line-clamp-1" title={artistNames(song)}>
                        {artistNames(song)}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground hidden lg:table-cell max-w-[140px]">
                      <span className="line-clamp-1" title={song.album?.name ?? ""}>
                        {song.album?.name || "—"}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground hidden md:table-cell">
                      {song.genre ? (
                        <Badge variant="secondary" className="text-[11px] whitespace-nowrap">
                          {song.genre.name}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {formatDuration(song.duration)}
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap">
                      {(song.playCount ?? 0).toLocaleString()}
                    </td>
                    <td className="p-4 text-muted-foreground whitespace-nowrap hidden xl:table-cell">
                      {(song._count?.likedBy ?? 0).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          song.isPublished
                            ? "bg-green-500/10 text-green-500"
                            : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {song.isPublished ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            togglePublish(song.id, song.isPublished ?? false)
                          }
                          disabled={togglingId === song.id}
                          title={song.isPublished ? "Unpublish" : "Publish"}
                        >
                          {song.isPublished ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="sm" asChild title="Edit song">
                          <Link href={`/admin/songs/${song.id}/edit`}>
                            <Edit className="w-4 h-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSongToDelete(song)}
                          className="text-destructive hover:text-destructive"
                          title="Delete song"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>

      <AdminPagination
        pagination={pagination}
        page={page}
        onPageChange={setPage}
      />

      <Dialog
        open={Boolean(songToDelete)}
        onOpenChange={(open) => {
          if (!open && !deleting) setSongToDelete(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete song</DialogTitle>
            <DialogDescription>
              {songToDelete ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-foreground">
                    “{songToDelete.title}”
                  </span>
                  {` by ${artistNames(songToDelete)}`}?
                  This action cannot be undone.
                </>
              ) : (
                "This action cannot be undone."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => songToDelete && deleteSong(songToDelete.id)}
              disabled={deleting}
              className={cn(deleting && "opacity-70")}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

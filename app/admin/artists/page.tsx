"use client";

import { toast } from "sonner";
import { AdminGridPageSkeleton } from "@/components/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Disc3,
  Edit,
  FilterX,
  Headphones,
  Heart,
  ListMusic,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useArtists } from "@/lib/swr";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { ADMIN_GRID_PAGE_SIZE } from "@/lib/pagination";
import { mutate } from "swr";
import { useDebounce } from "@/hooks/use-debounce";
import { getInitials, isPlaceholderCoverUrl } from "@/lib/utils";
import type { Artist } from "@/lib/types";

const SORT_OPTIONS = [
  { value: "popular", label: "Most listeners" },
  { value: "name", label: "Name A–Z" },
  { value: "recent", label: "Recently added" },
];

function parsePageParam(value: string | null) {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function pickSort(value: string | null) {
  return SORT_OPTIONS.some((o) => o.value === value) ? value! : "popular";
}

export default function ArtistsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") ?? ""
  );
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [sort, setSort] = useState(() => pickSort(searchParams.get("sort")));

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [artistToDelete, setArtistToDelete] = useState<Artist | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Keep URL in sync (shareable, survives refresh)
  const lastPushedParamsRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    if (sort !== "popular") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const key = params.toString();
    if (key !== searchParams.toString()) {
      lastPushedParamsRef.current = key;
      router.replace(key ? `${pathname}?${key}` : pathname, { scroll: false });
    }
  }, [debouncedSearchQuery, sort, page, pathname, router, searchParams]);

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
    const nextSort = pickSort(searchParams.get("sort"));
    setSort((prev) => (prev === nextSort ? prev : nextSort));
  }, [searchParams]);

  const {
    artists,
    pagination,
    isLoading,
    mutate: mutateArtists,
  } = useArtists({
    search: debouncedSearchQuery || undefined,
    sort: sort === "popular" ? undefined : sort,
    page,
    limit: ADMIN_GRID_PAGE_SIZE,
  });

  const hasActiveFilters = Boolean(debouncedSearchQuery) || sort !== "popular";

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSort(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSort("popular");
    setPage(1);
  };

  const handleDeleteClick = (artist: Artist) => {
    setArtistToDelete(artist);
    setDeleteDialogOpen(true);
  };

  const deleteArtist = async () => {
    if (!artistToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/artists/${artistToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Artist deleted successfully");
        mutateArtists();
        mutate("/api/artists");
        setDeleteDialogOpen(false);
        setArtistToDelete(null);
      } else {
        const payload = await response.json().catch(() => null);
        toast.error(payload?.error || "Failed to delete artist");
      }
    } catch (error) {
      console.error("Error deleting artist:", error);
      toast.error("Failed to delete artist");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Artists</h2>
          <p className="text-muted-foreground mt-1">
            Manage artist profiles
            {pagination ? ` · ${pagination.total.toLocaleString()} total` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/artists/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Artist
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search artists..."
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
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger className="w-44">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading && artists.length === 0 ? (
          <div className="col-span-full">
            <AdminGridPageSkeleton withHeader={false} withSearch={false} />
          </div>
        ) : artists.length === 0 ? (
          <div className="col-span-full text-center py-16 space-y-3">
            <Users className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "No artists match your filters"
                : "No artists found"}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear all filters
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/admin/artists/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first artist
                </Link>
              </Button>
            )}
          </div>
        ) : (
          artists.map((artist) => {
            const hasImage = !isPlaceholderCoverUrl(artist.imageUrl);
            const visibleGenres = artist.genres.slice(0, 3);
            const extraGenres = artist.genres.length - visibleGenres.length;
            return (
              <div
                key={artist.id}
                className="bg-card rounded-lg border border-border p-5 hover:shadow-lg transition-shadow flex flex-col h-full"
              >
                <div className="flex items-start gap-4 flex-1">
                  {hasImage ? (
                    <Image
                      width={64}
                      height={64}
                      src={artist.imageUrl}
                      alt={artist.name}
                      className="w-16 h-16 rounded-full object-cover shrink-0"
                      unoptimized
                    />
                  ) : (
                    <div
                      title={artist.name}
                      className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-xl font-bold text-primary uppercase shrink-0"
                    >
                      {getInitials(artist.name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">
                      {artist.name}
                    </h3>
                    {artist.englishName && (
                      <p className="text-sm text-muted-foreground truncate">
                        {artist.englishName}
                        {artist.country ? ` · ${artist.country}` : ""}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1 text-sm">
                      <Headphones className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-medium">
                        {(artist.monthlyListeners ?? 0).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        monthly listeners
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Disc3 className="w-3.5 h-3.5" />
                        {(artist.songCount ?? 0).toLocaleString()} songs
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5" />
                        {(artist.fans ?? 0).toLocaleString()} fans
                      </span>
                    </div>
                    {visibleGenres.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {visibleGenres.map((g) => (
                          <Badge
                            key={g}
                            variant="secondary"
                            className="text-[11px]"
                          >
                            {g}
                          </Badge>
                        ))}
                        {extraGenres > 0 && (
                          <Badge variant="outline" className="text-[11px]">
                            +{extraGenres}
                          </Badge>
                        )}
                      </div>
                    )}
                    {artist.bio && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {artist.bio}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                  <Button variant="ghost" size="sm" asChild className="flex-1">
                    <Link
                      href={`/admin/songs?artistId=${artist.id}&artistName=${encodeURIComponent(artist.name)}`}
                      title="View songs by this artist"
                    >
                      <ListMusic className="w-4 h-4 mr-2" />
                      Songs
                    </Link>
                  </Button>
                  <Button variant="ghost" size="sm" asChild className="flex-1">
                    <Link href={`/admin/artists/${artist.id}/edit`}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(artist)}
                    className="text-destructive hover:text-destructive"
                    title="Delete artist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <AdminPagination
        pagination={pagination}
        page={page}
        onPageChange={setPage}
      />

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && !deleting) {
            setDeleteDialogOpen(false);
            setArtistToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete artist</DialogTitle>
            <DialogDescription>
              {artistToDelete ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-foreground">
                    “{artistToDelete.name}”
                  </span>
                  ? This will permanently remove the artist and all associated
                  data. This action cannot be undone.
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
              onClick={deleteArtist}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

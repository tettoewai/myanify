"use client";

import { useEffect, useRef, useState } from "react";
import { AdminGridPageSkeleton } from "@/components/loading-skeletons";
import Image from "next/image";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Music,
  FilterX,
  ListMusic,
  Disc3,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { useAlbums } from "@/lib/swr";
import { ADMIN_GRID_PAGE_SIZE } from "@/lib/pagination";
import { mutate } from "swr";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { AlbumTypeBadge } from "@/components/album-type-badge";
import type { AlbumType } from "@/lib/album-type";
import { useDebounce } from "@/hooks/use-debounce";
import { isPlaceholderCoverUrl, getInitials } from "@/lib/utils";

interface Album {
  id: string;
  name: string;
  englishName: string | null;
  coverUrl: string | null;
  type: AlbumType;
  description: string | null;
  releaseDate: string | null;
  createdAt: string;
  artistImageUrl?: string | null;
  _count?: {
    songs: number;
  };
}

const TYPE_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "ALBUM", label: "Albums" },
  { value: "EP", label: "EPs" },
  { value: "SINGLE", label: "Singles" },
];

const SORT_OPTIONS = [
  { value: "name", label: "Name A–Z" },
  { value: "recent", label: "Recently added" },
];

function parsePageParam(value: string | null) {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

function formatFullDate(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AlbumsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [page, setPage] = useState(() => parsePageParam(searchParams.get("page")));
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get("search") ?? ""
  );
  const debouncedSearchQuery = useDebounce(searchQuery);
  const [typeFilter, setTypeFilter] = useState(() => {
    const t = searchParams.get("type");
    return t === "ALBUM" || t === "EP" || t === "SINGLE" ? t : "all";
  });
  const [sort, setSort] = useState<"name" | "recent">(() =>
    searchParams.get("sort") === "recent" ? "recent" : "name"
  );

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<Album | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Keep URL in sync (shareable, survives refresh)
  const lastPushedParamsRef = useRef<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearchQuery) params.set("search", debouncedSearchQuery);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (sort !== "name") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const key = params.toString();
    if (key !== searchParams.toString()) {
      lastPushedParamsRef.current = key;
      router.replace(key ? `${pathname}?${key}` : pathname, { scroll: false });
    }
  }, [debouncedSearchQuery, typeFilter, sort, page, pathname, router, searchParams]);

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
    const t = searchParams.get("type");
    const nextType = t === "ALBUM" || t === "EP" || t === "SINGLE" ? t : "all";
    setTypeFilter((prev) => (prev === nextType ? prev : nextType));
    const nextSort = searchParams.get("sort") === "recent" ? "recent" : "name";
    setSort((prev) => (prev === nextSort ? prev : nextSort));
  }, [searchParams]);

  const {
    albums,
    pagination,
    isLoading,
    mutate: mutateAlbums,
  } = useAlbums({
    search: debouncedSearchQuery || undefined,
    type: typeFilter === "all" ? undefined : typeFilter,
    sort,
    page,
    limit: ADMIN_GRID_PAGE_SIZE,
  });

  const hasActiveFilters =
    Boolean(debouncedSearchQuery) || typeFilter !== "all";

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleTypeChange = (value: string) => {
    setTypeFilter(value);
    setPage(1);
  };

  const handleSortChange = (value: "name" | "recent") => {
    setSort(value);
    setPage(1);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSort("name");
    setPage(1);
  };

  const handleDeleteClick = (album: Album) => {
    setAlbumToDelete(album);
    setDeleteDialogOpen(true);
  };

  const deleteAlbum = async () => {
    if (!albumToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/albums/${albumToDelete.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Album deleted successfully");
        mutateAlbums();
        mutate("/api/albums");
        setDeleteDialogOpen(false);
        setAlbumToDelete(null);
      } else {
        const payload = await response.json().catch(() => null);
        toast.error(payload?.error || "Failed to delete album");
      }
    } catch (error) {
      console.error("Error deleting album:", error);
      toast.error("Failed to delete album");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Albums</h2>
          <p className="text-muted-foreground mt-1">
            Manage music albums
            {pagination ? ` · ${pagination.total.toLocaleString()} total` : ""}
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/albums/new">
            <Plus className="w-4 h-4 mr-2" />
            Add Album
          </Link>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search albums..."
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
          <Select value={typeFilter} onValueChange={handleTypeChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={sort}
            onValueChange={(v) => handleSortChange(v as "name" | "recent")}
          >
            <SelectTrigger className="w-40">
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading && albums.length === 0 ? (
          <div className="col-span-full">
            <AdminGridPageSkeleton withHeader={false} withSearch={false} />
          </div>
        ) : albums.length === 0 ? (
          <div className="col-span-full text-center py-16 space-y-3">
            <Disc3 className="w-10 h-10 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {hasActiveFilters
                ? "No albums match your filters"
                : "No albums found"}
            </p>
            {hasActiveFilters ? (
              <Button variant="outline" size="sm" onClick={resetFilters}>
                Clear all filters
              </Button>
            ) : (
              <Button size="sm" asChild>
                <Link href="/admin/albums/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Add your first album
                </Link>
              </Button>
            )}
          </div>
        ) : (
          albums.map((album: Album) => {
            const hasCover = Boolean(
              album.coverUrl && !isPlaceholderCoverUrl(album.coverUrl)
            );
            const releaseLabel = formatFullDate(album.releaseDate);
            const songCount = album._count?.songs ?? 0;
            return (
              <div
                key={album.id}
                className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
              >
                <div className="aspect-3/2 relative bg-muted">
                  {hasCover ? (
                    <Image
                      src={album.coverUrl!}
                      alt={album.name}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-primary/10">
                      <span className="text-4xl font-bold text-primary uppercase">
                        {getInitials(album.name)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  {album.artistImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={album.artistImageUrl}
                      alt=""
                      className="absolute top-2 right-2 w-8 h-8 rounded-full object-cover ring-2 ring-white/40"
                    />
                  )}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <AlbumTypeBadge type={album.type} />
                    </div>
                    <h3
                      className="font-bold text-white text-base line-clamp-1"
                      title={album.name}
                    >
                      {album.name}
                    </h3>
                    <p className="text-xs text-white/80 truncate">
                      {album.englishName && album.englishName !== album.name
                        ? `${album.englishName} · `
                        : ""}
                      {releaseLabel ?? "Unreleased"}
                    </p>
                  </div>
                </div>
                <div className="p-3 flex flex-col flex-1">
                  {album.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1 mb-2">
                      {album.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <Music className="w-4 h-4" />
                    <span>
                      {songCount} song{songCount === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-1 border-t border-border">
                    <Button variant="ghost" size="sm" asChild className="flex-1">
                      <Link
                        href={`/admin/songs?albumId=${album.id}&albumName=${encodeURIComponent(album.name)}`}
                        title="View songs in this album"
                      >
                        <ListMusic className="w-4 h-4 mr-2" />
                        Songs
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild className="flex-1">
                      <Link href={`/admin/albums/${album.id}/edit`}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteClick(album)}
                      className="text-destructive hover:text-destructive"
                      title="Delete album"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
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
            setAlbumToDelete(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete album</DialogTitle>
            <DialogDescription>
              {albumToDelete ? (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-medium text-foreground">
                    “{albumToDelete.name}”
                  </span>
                  ? Songs linked to this album will have their album reference
                  removed. This action cannot be undone.
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
              onClick={deleteAlbum}
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

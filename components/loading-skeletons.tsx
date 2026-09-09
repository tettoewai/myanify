import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function SongListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-3 rounded-lg">
          <Skeleton className="w-6 h-4" />
          <Skeleton className="w-12 h-12 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32 max-w-full" />
            <Skeleton className="h-4 w-24 max-w-full" />
          </div>
          <Skeleton className="w-10 h-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function ArtistGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-3 p-4">
          <Skeleton className="w-24 h-24 rounded-full" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

export function AlbumGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function HorizontalCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton className="w-14 h-14 rounded-md shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitleSkeleton() {
  return (
    <div className="flex items-center justify-between mb-4">
      <Skeleton className="h-7 w-40" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function HomePageSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8" aria-hidden>
      <Skeleton className="h-48 md:h-56 w-full rounded-2xl" />
      <section>
        <SectionTitleSkeleton />
        <HorizontalCardsSkeleton count={4} />
      </section>
      <section>
        <SectionTitleSkeleton />
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-36 shrink-0 rounded-xl" />
          ))}
        </div>
      </section>
      <section>
        <SectionTitleSkeleton />
        <ArtistGridSkeleton count={6} />
      </section>
      <section>
        <SectionTitleSkeleton />
        <AlbumGridSkeleton count={6} />
      </section>
    </div>
  );
}

export function DetailPageSkeleton({
  bannerClassName = "h-64 md:h-80",
}: {
  bannerClassName?: string;
}) {
  return (
    <div className="min-h-full" aria-hidden>
      <Skeleton className={cn("w-full rounded-none", bannerClassName)} />
      <div className="flex items-center gap-4 p-6 md:p-8">
        <Skeleton className="h-12 w-32 rounded-full" />
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
      <div className="px-6 md:px-8 pb-8">
        <SongListSkeleton rows={8} />
      </div>
    </div>
  );
}

export function PlaylistPageSkeleton() {
  return (
    <div className="min-h-full" aria-hidden>
      <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-end">
        <Skeleton className="w-48 h-48 md:w-56 md:h-56 rounded-xl shrink-0" />
        <div className="flex-1 space-y-3 w-full">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-64 max-w-full" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>
      <div className="px-6 md:px-8 pb-8">
        <SongListSkeleton rows={10} />
      </div>
    </div>
  );
}

export function LibraryPageSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6" aria-hidden>
      <div className="flex items-center justify-between">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-10 w-36 rounded-md" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SeeAllPageSkeleton({
  section = "genres",
}: {
  section?: "genres" | "artists" | "albums" | "playlists" | "recently-played";
}) {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 pb-32" aria-hidden>
      <div className="flex items-start gap-4">
        <Skeleton className="w-10 h-10 rounded-md shrink-0" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-9 w-48 max-w-full" />
          <Skeleton className="h-4 w-64 max-w-full" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
      {section === "artists" ? (
        <ArtistGridSkeleton count={12} />
      ) : (
        <AlbumGridSkeleton count={12} />
      )}
    </div>
  );
}

export function SearchPageSkeleton() {
  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 pb-32" aria-hidden>
      <Skeleton className="h-12 w-full max-w-xl rounded-lg" />
      <section>
        <Skeleton className="h-7 w-24 mb-4" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

export function LoginPageSkeleton() {
  return (
    <div className="w-full max-w-md space-y-8" aria-hidden>
      <div className="text-center space-y-2">
        <Skeleton className="h-9 w-32 mx-auto" />
        <Skeleton className="h-4 w-48 mx-auto" />
      </div>
      <div className="space-y-4 rounded-xl border border-border p-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

export function LandingPageSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-hidden>
      <Skeleton className="h-16 w-full rounded-none" />
      <div className="container mx-auto px-4 py-16 space-y-8">
        <Skeleton className="h-12 w-3/4 max-w-lg mx-auto" />
        <Skeleton className="h-6 w-full max-w-md mx-auto" />
        <Skeleton className="h-12 w-40 mx-auto rounded-full" />
      </div>
    </div>
  );
}

export function AdminPageHeaderSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <Skeleton className="h-10 w-32 rounded-md shrink-0" />
    </div>
  );
}

export function AdminTableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden" aria-hidden>
      <div className="border-b border-border bg-muted/30 p-4 flex gap-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/5" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="p-4 flex items-center gap-4 border-b border-border last:border-0"
        >
          <Skeleton className="h-10 w-10 rounded-md shrink-0" />
          <Skeleton className="h-4 flex-1 max-w-xs" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-20 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function AdminListPageSkeleton({
  withSearch = true,
}: {
  withSearch?: boolean;
}) {
  return (
    <div className="space-y-6" aria-hidden>
      <AdminPageHeaderSkeleton />
      {withSearch && <Skeleton className="h-10 w-full max-w-md rounded-md" />}
      <AdminTableSkeleton />
    </div>
  );
}

export function AdminGridPageSkeleton({
  count = 8,
  withHeader = true,
  withSearch = true,
}: {
  count?: number;
  withHeader?: boolean;
  withSearch?: boolean;
}) {
  return (
    <div className="space-y-6" aria-hidden>
      {withHeader && <AdminPageHeaderSkeleton />}
      {withSearch && <Skeleton className="h-10 w-full max-w-md rounded-md" />}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-4 space-y-3">
            <Skeleton className="aspect-video w-full rounded-md" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminFormPageSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="space-y-6 max-w-2xl" aria-hidden>
      <div className="flex items-center gap-4">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="rounded-lg border border-border p-6 space-y-6">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-32 w-full rounded-md" />
        <div className="flex gap-3">
          <Skeleton className="h-10 w-28 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8" aria-hidden>
      <div className="space-y-2">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border p-6 space-y-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminCardListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="rounded-lg border border-border divide-y divide-border" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
          <Skeleton className="h-9 w-24 rounded-md shrink-0" />
        </div>
      ))}
    </div>
  );
}

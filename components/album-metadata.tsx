import { formatAlbumWithType, type AlbumType } from "@/lib/album-type";
import { cn } from "@/lib/utils";

interface AlbumMetadataProps {
  name?: string;
  type?: AlbumType | null;
  className?: string;
}

export function AlbumMetadata({ name, type, className }: AlbumMetadataProps) {
  if (!name) return null;

  return (
    <span className={cn("block truncate leading-loose", className)}>
      {formatAlbumWithType(name, type)}
    </span>
  );
}

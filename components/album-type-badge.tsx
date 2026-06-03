import { Badge } from "@/components/ui/badge";
import { ALBUM_TYPE_LABELS, type AlbumType } from "@/lib/album-type";
import { cn } from "@/lib/utils";

interface AlbumTypeBadgeProps {
  type: AlbumType;
  className?: string;
}

export function AlbumTypeBadge({ type, className }: AlbumTypeBadgeProps) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs font-medium uppercase tracking-wide",
        type === "SINGLE" &&
          "bg-secondary/15 text-secondary-foreground dark:text-secondary-foreground",
        type === "EP" &&
          "bg-accent/15 text-accent-foreground dark:text-accent-foreground",
        type === "ALBUM" &&
          "bg-primary/15 text-primary-foreground dark:text-primary-foreground",
        className,
      )}
    >
      {ALBUM_TYPE_LABELS[type]}
    </Badge>
  );
}

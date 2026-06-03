export const ALBUM_TYPES = ["SINGLE", "EP", "ALBUM"] as const;

export type AlbumType = (typeof ALBUM_TYPES)[number];

export const ALBUM_TYPE_LABELS: Record<AlbumType, string> = {
  SINGLE: "Single",
  EP: "EP",
  ALBUM: "Album",
};

export function isAlbumType(value: unknown): value is AlbumType {
  return (
    typeof value === "string" &&
    ALBUM_TYPES.includes(value as AlbumType)
  );
}

export function formatAlbumWithType(
  name: string,
  type?: AlbumType | null
): string {
  if (!name) return "";
  if (!type) return name;
  return `${name} · ${ALBUM_TYPE_LABELS[type]}`;
}

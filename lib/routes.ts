export type RoutableEntity = "song" | "artist" | "album" | "genre" | "playlist";

export function entityPath(type: RoutableEntity, slug: string): string {
  return `/${type}/${slug}`;
}

export function absoluteEntityUrl(
  siteUrl: string,
  type: RoutableEntity,
  slug: string,
): string {
  return `${siteUrl}${entityPath(type, slug)}`;
}

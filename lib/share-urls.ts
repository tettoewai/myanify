import { getSiteUrl } from "@/lib/site-url";
import { entityPath, type RoutableEntity } from "@/lib/routes";

export type ShareableEntity = RoutableEntity;

export function sharePath(type: ShareableEntity, slug: string): string {
  return entityPath(type, slug);
}

export function getAbsoluteShareUrl(
  type: ShareableEntity,
  slug: string,
  origin?: string,
): string {
  const base = origin ?? getSiteUrl();
  return new URL(sharePath(type, slug), base).href;
}

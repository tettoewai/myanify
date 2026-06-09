import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export const HOME_PLAYER_QUERY_KEY = "player";
export const HOME_SONG_QUERY_KEY = "song";

export function isHomePlayerOpen(value: string | null): boolean {
  return value === "1" || value === "true" || value === "open";
}

export function readHomePlayerParams(searchParams: URLSearchParams) {
  return {
    songSlug: searchParams.get(HOME_SONG_QUERY_KEY),
    playerOpen: isHomePlayerOpen(searchParams.get(HOME_PLAYER_QUERY_KEY)),
  };
}

export function writeHomePlayerParams(
  router: AppRouterInstance,
  searchParams: URLSearchParams,
  patch: { song?: string | null; player?: boolean | null },
) {
  const params = new URLSearchParams(searchParams.toString());

  if (patch.song !== undefined) {
    if (patch.song) {
      params.set(HOME_SONG_QUERY_KEY, patch.song);
    } else {
      params.delete(HOME_SONG_QUERY_KEY);
    }
  }

  if (patch.player !== undefined) {
    if (patch.player) {
      params.set(HOME_PLAYER_QUERY_KEY, "1");
    } else {
      params.delete(HOME_PLAYER_QUERY_KEY);
    }
  }

  const nextQuery = params.toString();
  const currentQuery = searchParams.toString();
  if (nextQuery === currentQuery) return;

  router.replace(nextQuery ? `/home?${nextQuery}` : "/home", { scroll: false });
}

"use client";

import { useRouter } from "next/navigation";
import { entityPath, seeAllPath, type RoutableEntity } from "@/lib/routes";
import { isSeeAllSection } from "@/lib/see-all-sections";

export function useNavigation() {
  const router = useRouter();

  const navigate = (view: string, slug?: string) => {
    if (view === "home") {
      router.push("/home");
    } else if (view === "search") {
      router.push("/search");
    } else if (view === "library") {
      router.push("/library");
    } else if (view === "premium") {
      router.push("/premium");
    } else if (view === "see-all" && slug && isSeeAllSection(slug)) {
      router.push(seeAllPath(slug));
    } else if (slug && ["genre", "artist", "playlist", "album", "song"].includes(view)) {
      router.push(entityPath(view as RoutableEntity, slug));
    }
  };

  const navigateBack = () => router.back();

  return { navigate, navigateBack };
}

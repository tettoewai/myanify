"use client";

import { useCallback, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  readHomePlayerParams,
  writeHomePlayerParams,
} from "@/lib/player-url";

export function useHomePlayerUrl() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const isHome = pathname === "/home";
  const params = readHomePlayerParams(searchParams);

  const setPlayerInUrl = useCallback(
    (open: boolean) => {
      if (pathname !== "/home") return;
      writeHomePlayerParams(router, searchParamsRef.current, { player: open });
    },
    [pathname, router],
  );

  const setSongInUrl = useCallback(
    (slug: string | null) => {
      if (pathname !== "/home") return;
      writeHomePlayerParams(router, searchParamsRef.current, { song: slug });
    },
    [pathname, router],
  );

  return {
    isHome,
    params,
    setPlayerInUrl,
    setSongInUrl,
  };
}

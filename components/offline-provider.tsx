"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useOfflineDownloads } from "@/hooks/use-offline-downloads";

type OfflineContextValue = ReturnType<typeof useOfflineDownloads>;

const OfflineContext = createContext<OfflineContextValue | null>(null);

/** Mount once (inside ListenerLayoutWrapper) — shares one queue + reconcile. */
export function OfflineProvider({ children }: { children: ReactNode }) {
  const value = useOfflineDownloads();
  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  );
}

export function useOffline(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) throw new Error("useOffline must be used within OfflineProvider");
  return ctx;
}

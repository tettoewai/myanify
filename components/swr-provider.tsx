"use client";

import { SWRConfig } from "swr";

interface SWRProviderProps {
  fallback: Record<string, unknown>;
  children: React.ReactNode;
}

/**
 * Wraps children in an SWRConfig with pre-fetched server data as fallback.
 * Place this in a server component page to eliminate the client-side loading
 * skeleton on first render and ensure crawlers see full HTML content.
 */
export function SWRProvider({ fallback, children }: SWRProviderProps) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>;
}

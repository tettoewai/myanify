import { CacheFirst, NetworkFirst, NetworkOnly, Serwist, StaleWhileRevalidate } from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: Array<string | { url: string; revision?: string }>;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  runtimeCaching: [
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "pages" }),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin &&
        (request.destination === "script" || request.destination === "style"),
      handler: new StaleWhileRevalidate({ cacheName: "assets" }),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.destination === "image",
      handler: new CacheFirst({ cacheName: "images" }),
    },
    {
      matcher: ({ request, sameOrigin }) =>
        sameOrigin && request.destination === "font",
      handler: new CacheFirst({ cacheName: "fonts" }),
    },
    {
      // Audio streaming bypasses the SW cache: offline playback is owned by
      // IndexedDB (`lib/offline-storage.ts`), and CacheFirst breaks Range
      // requests needed for seeking.
      matcher: ({ url, sameOrigin }: any) =>
        sameOrigin && url.pathname === "/api/audio/stream",
      handler: new NetworkOnly(),
    },
  ],
});

serwist.addEventListeners();

// Background Sync drain signal (Android Chrome only — iOS has no SyncManager).
// The actual queue lives in IndexedDB and is drained by the foreground page
// via `hooks/use-offline-downloads.ts`; here we just wake clients.
self.addEventListener("sync", (event: Event) => {
  const syncEvent = event as unknown as {
    tag: string;
    waitUntil: (promise: Promise<unknown>) => void;
  };
  if (syncEvent.tag !== "download-queue") return;
  syncEvent.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        client.postMessage({ type: "OFFLINE_DRAIN_QUEUE" });
      }
    })(),
  );
});

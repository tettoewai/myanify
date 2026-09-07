"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Download, Loader2 } from "lucide-react";
import { useOffline } from "@/components/offline-provider";

/**
 * Floating download progress pill — visible app-wide whenever the offline
 * queue has active work. Sits above the player bar / mobile nav.
 * Also owns sequential foreground draining so queued tracks keep flowing
 * while the user browses (iOS has no Background Sync).
 */
export function FloatingDownloadProgress() {
  const router = useRouter();
  const { queue, downloadNext, isSupported } = useOffline();
  const drainingRef = useRef(false);
  // Completion state — keeps the pill visible ("View in Download") for a
  // moment after the last track finishes instead of snapping closed.
  const [showComplete, setShowComplete] = useState(false);
  const prevHadWork = useRef(false);

  // Drain sequentially whenever the queue is non-empty.
  useEffect(() => {
    if (!isSupported || queue.length === 0 || drainingRef.current) return;
    drainingRef.current = true;
    (async () => {
      try {
        for (;;) {
          const worked = await downloadNext();
          if (!worked) break;
        }
      } finally {
        drainingRef.current = false;
        prevHadWork.current = true;
      }
    })();
  }, [isSupported, queue.length, downloadNext]);

  // When the queue transitions from active to empty, show a short-lived
  // completion pill so the user can jump to Downloads.
  useEffect(() => {
    if (!isSupported) return;
    const hadWork = prevHadWork.current || queue.length > 0;
    if (!hadWork) {
      setShowComplete(false);
      return;
    }
    if (queue.length === 0) {
      const id = setTimeout(() => {
        setShowComplete(false);
        prevHadWork.current = false;
      }, 4000);
      return () => clearTimeout(id);
    }
  }, [isSupported, queue.length]);

  if (!isSupported) return null;
  if (queue.length === 0 && !showComplete) return null;

  const isComplete = queue.length === 0;
  const current =
    queue.find((t) => t.status === "downloading") ?? queue[0];

  return (
    <button
      type="button"
      onClick={() => router.push("/downloads")}
      aria-label={
        isComplete
          ? "Download complete — view downloads"
          : "Downloads in progress — view downloads"
      }
      className="fixed bottom-36 md:bottom-28 right-4 z-50 w-64 rounded-xl border border-border bg-card/95 backdrop-blur-lg shadow-xl p-3 text-left hover:bg-card transition-colors"
    >
      <div className="flex items-center gap-2">
        {isComplete ? (
          <Check className="w-4 h-4 shrink-0 text-emerald-500" />
        ) : current.status === "downloading" ? (
          <Loader2 className="w-4 h-4 shrink-0 animate-spin text-primary" />
        ) : (
          <Download className="w-4 h-4 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">
            {isComplete
              ? "Download complete"
              : current.status === "downloading"
                ? `Downloading ${current.progress}%`
                : `Queued (${queue.length})`}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {isComplete ? "View in Download" : current.title || "Preparing…"}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground" />
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all"
          style={{
            width: `${isComplete ? 100 : current.status === "downloading" ? current.progress : 0}%`,
          }}
        />
      </div>
    </button>
  );
}

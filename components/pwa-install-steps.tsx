"use client";

import { Share } from "lucide-react";

/** Manual Add to Home Screen steps — iOS Safari has no install prompt API. */
export function PwaInstallSteps({ compact = false }: { compact?: boolean }) {
  return (
    <ol
      className={
        compact
          ? "space-y-2 text-xs text-muted-foreground"
          : "space-y-2 text-sm text-muted-foreground"
      }
    >
      <li className="flex items-start gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
          1
        </span>
        <span>
          Tap the{" "}
          <Share className="inline h-3.5 w-3.5 -mt-0.5 text-foreground" />{" "}
          Share button in Safari&apos;s toolbar
        </span>
      </li>
      <li className="flex items-start gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
          2
        </span>
        <span>Scroll down and tap “Add to Home Screen”</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
          3
        </span>
        <span>Tap “Add” in the top-right corner</span>
      </li>
    </ol>
  );
}

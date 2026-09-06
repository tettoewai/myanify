"use client";

import { useState } from "react";
import { AppWindow, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PWA_BANNER_DISMISS_KEY,
  useIsIOSWeb,
} from "@/lib/app-release";
import { PwaInstallSteps } from "@/components/pwa-install-steps";

/**
 * PWA install banner — iOS web only (hidden when already installed).
 * iOS Safari offers no install-prompt API, so the Install button
 * expands manual Add to Home Screen steps inline.
 */
export function PwaInstallBanner() {
  const isIOS = useIsIOSWeb();
  const [showSteps, setShowSteps] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(PWA_BANNER_DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (!isIOS || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(PWA_BANNER_DISMISS_KEY, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div
      role="region"
      aria-label="Install the Myanify app"
      className="rounded-2xl border border-primary/25 bg-primary/10"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
          <AppWindow className="h-5 w-5 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-foreground">
            Install Myanify
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            Add to Home Screen for faster, fullscreen listening
          </span>
        </span>
        <Button
          size="sm"
          onClick={() => setShowSteps((s) => !s)}
          aria-expanded={showSteps}
          className="shrink-0 rounded-full bg-primary hover:bg-primary/90"
        >
          {showSteps ? "Hide" : "Install"}
        </Button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss app install banner"
          className="shrink-0 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {showSteps && (
        <div className="border-t border-primary/15 px-4 py-3">
          <PwaInstallSteps compact />
        </div>
      )}
    </div>
  );
}

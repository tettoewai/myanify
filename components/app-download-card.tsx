"use client";

import { Download, ExternalLink, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  APP_DOWNLOAD_URL,
  formatApkSize,
  getReleasesPageUrl,
  useAppRelease,
  useIsAndroidWeb,
} from "@/lib/app-release";

/**
 * Settings download card — rendered only on Android web.
 * Downloads the latest APK from the GitHub release repo
 * via the stable /api/app-download redirect.
 */
export function AppDownloadCard() {
  const isAndroid = useIsAndroidWeb();
  const { manifest, isLoading } = useAppRelease();

  if (!isAndroid) return null;

  const size = formatApkSize(manifest?.fileSize);
  const releasesPage = getReleasesPageUrl(manifest?.apkUrl);

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Smartphone className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Myanify Android app</CardTitle>
            <CardDescription className="text-xs">
              {manifest?.version
                ? `Latest version v${manifest.version}${size ? ` · ${size}` : ""}`
                : "Native app with offline mode"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !manifest ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Checking latest version…
          </div>
        ) : (
          <>
            {manifest?.notes && (
              <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">
                {manifest.notes}
              </p>
            )}
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                asChild
                className="gap-2 rounded-full bg-primary hover:bg-primary/90"
              >
                <a href={APP_DOWNLOAD_URL} download>
                  <Download className="h-4 w-4" />
                  Download APK
                  {manifest?.version ? ` (v${manifest.version})` : ""}
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2 rounded-full">
                <a
                  href={releasesPage}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                  All releases
                </a>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              After downloading, open the APK and allow “Install unknown apps”
              when prompted. Updates are published from the GitHub release
              repo.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

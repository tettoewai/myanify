"use client";

import { AppWindow } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useIsIOSWeb } from "@/lib/app-release";
import { PwaInstallSteps } from "@/components/pwa-install-steps";

/**
 * Settings install card — rendered only on iOS web when the PWA
 * is not already installed. There is no native iOS app / APK,
 * so installation is Add to Home Screen.
 */
export function PwaInstallCard() {
  const isIOS = useIsIOSWeb();

  if (!isIOS) return null;

  return (
    <Card className="border-border/60 shadow-sm overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <AppWindow className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Install Myanify app</CardTitle>
            <CardDescription className="text-xs">
              Add to Home Screen for fullscreen, app-like listening
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <PwaInstallSteps />
        <p className="text-xs text-muted-foreground">
          Once installed, Myanify opens fullscreen from your Home Screen like
          a native app.
        </p>
      </CardContent>
    </Card>
  );
}

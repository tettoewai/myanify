"use client";

import { useState, useEffect } from "react";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAds } from "@/lib/api";
import type { Ad } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getImageProxyUrl } from "@/lib/image-proxy";

export function AdBanner() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    getAds().then(setAds).catch(console.error);
  }, []);

  useEffect(() => {
    if (ads.length === 0) return;
    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ads.length);
    }, 15000);

    return () => clearInterval(interval);
  }, [ads.length]);

  const currentAd = ads[currentAdIndex];

  if (isDismissed || !currentAd || ads.length === 0) return null;

  return (
    <div className="mx-4 md:mx-8 my-6">
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-r from-card to-accent/30 border border-border">
        {/* Dismiss button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-6 w-6 z-10 hover:bg-background/50"
          onClick={() => setIsDismissed(true)}
        >
          <X className="w-3 h-3" />
        </Button>

        <a
          href={currentAd.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-col sm:flex-row items-center gap-4 p-4 group"
        >
          {/* Ad Image */}
          <div className="w-full sm:w-48 h-24 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={getImageProxyUrl(currentAd.imageUrl)}
              alt={currentAd.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Ad Content */}
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded">
                Sponsored
              </span>
            </div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
              {currentAd.title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {currentAd.description}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              by {currentAd.sponsor}
            </p>
          </div>

          {/* CTA */}
          <div className="flex-shrink-0">
            <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
              Learn More
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </a>

        {/* Ad Indicator Dots */}
        <div className="flex justify-center gap-1.5 pb-3">
          {ads.map((_, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                setCurrentAdIndex(index);
              }}
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                index === currentAdIndex
                  ? "bg-primary w-4"
                  : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

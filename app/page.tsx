import type { Metadata } from "next";
import { Suspense } from "react";
import { LandingPageContent } from "@/components/landing-page";
import { StructuredData } from "@/components/structured-data";
import {
  landingMetadata,
  landingStructuredData,
} from "@/lib/landing-seo";

export const metadata: Metadata = landingMetadata;

export default function HomePage() {
  return (
    <>
      <StructuredData data={landingStructuredData} />
      <Suspense
        fallback={
          <div className="min-h-screen bg-background flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold mb-2">Myanify</div>
              <div className="text-muted-foreground">Loading...</div>
            </div>
          </div>
        }
      >
        <LandingPageContent />
      </Suspense>
    </>
  );
}

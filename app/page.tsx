import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { auth } from "@/auth";
import { LandingPageContent } from "@/components/landing-page";
import { StructuredData } from "@/components/structured-data";
import { LandingPageSkeleton } from "@/components/loading-skeletons";
import {
  landingMetadata,
  landingStructuredData,
} from "@/lib/landing-seo";

export const metadata: Metadata = landingMetadata;

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/home");
  }

  return (
    <>
      <StructuredData data={landingStructuredData} />
      <Suspense
        fallback={<LandingPageSkeleton />}
      >
        <LandingPageContent />
      </Suspense>
    </>
  );
}

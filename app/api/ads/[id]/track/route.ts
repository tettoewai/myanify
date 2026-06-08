import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { enforceRateLimit, writeLimiter } from "@/lib/rate-limit";

// POST - Track ad click or impression
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await enforceRateLimit(request, writeLimiter, "ad-track");
  if (limited) return limited;

  try {
    const { id } = await params;
    const body = await request.json();
    const { type } = body; // 'click' or 'impression'

    if (!type || !["click", "impression"].includes(type)) {
      return NextResponse.json(
        { error: "type must be 'click' or 'impression'" },
        { status: 400 }
      );
    }

    // Verify ad exists
    const ad = await prisma.ad.findUnique({
      where: { id },
    });

    if (!ad) {
      return NextResponse.json({ error: "Ad not found" }, { status: 404 });
    }

    // Increment the appropriate counter
    const updatedAd = await prisma.ad.update({
      where: { id },
      data: {
        ...(type === "click" && { clickCount: { increment: 1 } }),
        ...(type === "impression" && { impressionCount: { increment: 1 } }),
      },
    });

    return NextResponse.json({
      success: true,
      clickCount: updatedAd.clickCount,
      impressionCount: updatedAd.impressionCount,
    });
  } catch (error) {
    console.error("Error tracking ad:", error);
    return NextResponse.json(
      { error: "Failed to track ad" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { isUserVIP, canUserDownload } from "@/lib/vip-subscription";
import { getPlaybackUrl } from "@/lib/playback-url";

/**
 * GET /api/vip/downloads
 * Get user's offline downloads
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const downloads = await prisma.offlineDownload.findMany({
      where: { userId: session.user.id },
      include: {
        song: {
          include: {
            artists: {
              include: {
                artist: true,
              },
            },
            album: true,
          },
        },
      },
      orderBy: { downloadedAt: "desc" },
    });

    return NextResponse.json({ downloads });
  } catch (error) {
    console.error("Error fetching downloads:", error);
    return NextResponse.json(
      { error: "Failed to fetch downloads" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vip/downloads
 * Initiate download for a song (VIP only)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { songId } = body;

    if (!songId) {
      return NextResponse.json(
        { error: "Song ID is required" },
        { status: 400 }
      );
    }

    // Check VIP status
    const vipCheck = await isUserVIP(session.user.id);
    if (!vipCheck) {
      return NextResponse.json(
        { error: "VIP subscription required for offline downloads" },
        { status: 403 }
      );
    }

    // Check download limits
    const downloadCheck = await canUserDownload(session.user.id);
    if (!downloadCheck.allowed) {
      return NextResponse.json(
        { error: downloadCheck.reason || "Download limit reached" },
        { status: 403 }
      );
    }

    // Check if song exists
    const song = await prisma.song.findUnique({
      where: { id: songId },
    });

    if (!song) {
      return NextResponse.json(
        { error: "Song not found" },
        { status: 404 }
      );
    }

    // Check if already downloaded
    const existing = await prisma.offlineDownload.findUnique({
      where: {
        userId_songId: {
          userId: session.user.id,
          songId,
        },
      },
    });

    if (existing && existing.downloadStatus === "COMPLETED") {
      return NextResponse.json({
        message: "Song already downloaded",
        download: existing,
      });
    }

    // Create or update download record
    const download = await prisma.offlineDownload.upsert({
      where: {
        userId_songId: {
          userId: session.user.id,
          songId,
        },
      },
      create: {
        userId: session.user.id,
        songId,
        downloadStatus: "PENDING",
        progress: 0,
      },
      update: {
        downloadStatus: "PENDING",
        progress: 0,
      },
    });

    return NextResponse.json({
      message: "Download initiated",
      download,
      audioUrl: song.audioUrl,
      playbackUrl: getPlaybackUrl(song.audioUrl, request),
    });
  } catch (error) {
    console.error("Error initiating download:", error);
    return NextResponse.json(
      { error: "Failed to initiate download" },
      { status: 500 }
    );
  }
}

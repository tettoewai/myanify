import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * GET /api/vip/downloads/[id]
 * Get specific download status
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const download = await prisma.offlineDownload.findUnique({
      where: { id },
      include: {
        song: {
          include: {
            artists: {
              include: {
                artist: true,
              },
            },
          },
        },
      },
    });

    if (!download) {
      return NextResponse.json(
        { error: "Download not found" },
        { status: 404 }
      );
    }

    if (download.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ download });
  } catch (error) {
    console.error("Error fetching download:", error);
    return NextResponse.json(
      { error: "Failed to fetch download" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/vip/downloads/[id]
 * Update download status/progress (client-side updates)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status, progress, fileSize, checksum } = body;

    const download = await prisma.offlineDownload.findUnique({
      where: { id },
    });

    if (!download) {
      return NextResponse.json(
        { error: "Download not found" },
        { status: 404 }
      );
    }

    if (download.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const updateData: any = {};
    if (status) updateData.downloadStatus = status;
    if (progress !== undefined) updateData.progress = Math.max(0, Math.min(100, progress));
    if (fileSize) updateData.fileSize = fileSize;
    if (checksum) updateData.checksum = checksum;

    const updated = await prisma.offlineDownload.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      message: "Download updated",
      download: updated,
    });
  } catch (error) {
    console.error("Error updating download:", error);
    return NextResponse.json(
      { error: "Failed to update download" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/vip/downloads/[id]
 * Delete/remove download
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const download = await prisma.offlineDownload.findUnique({
      where: { id },
    });

    if (!download) {
      return NextResponse.json(
        { error: "Download not found" },
        { status: 404 }
      );
    }

    if (download.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.offlineDownload.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Download removed" });
  } catch (error) {
    console.error("Error deleting download:", error);
    return NextResponse.json(
      { error: "Failed to delete download" },
      { status: 500 }
    );
  }
}

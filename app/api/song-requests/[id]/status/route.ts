import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { notifySongRequestUpdate } from "@/lib/notifications";

/**
 * PATCH /api/song-requests/[id]/status
 * Admin: Approve or reject a song request
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["APPROVED", "REJECTED"].includes(status)) {
      return NextResponse.json(
        { error: "Status must be 'APPROVED' or 'REJECTED'" },
        { status: 400 }
      );
    }

    const songRequest = await prisma.songRequest.findUnique({
      where: { id },
    });

    if (!songRequest) {
      return NextResponse.json(
        { error: "Song request not found" },
        { status: 404 }
      );
    }

    if (songRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Song request is already ${songRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    const updated = await prisma.songRequest.update({
      where: { id },
      data: {
        status,
        reviewedBy: session.user.id,
        reviewedAt: new Date(),
      },
    });

    void notifySongRequestUpdate(songRequest.userId, status, songRequest.songTitle);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating song request:", error);
    return NextResponse.json(
      { error: "Failed to update song request" },
      { status: 500 }
    );
  }
}

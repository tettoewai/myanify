import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { auth } from "@/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const genre = await prisma.genre.findUnique({
      where: { id },
      include: {
        songs: {
          where: { isPublished: true },
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
    });

    if (!genre) {
      return NextResponse.json({ error: "Genre not found" }, { status: 404 });
    }

    return NextResponse.json(genre);
  } catch (error) {
    console.error("Error fetching genre:", error);
    return NextResponse.json(
      { error: "Failed to fetch genre" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    await prisma.genre.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting genre:", error);
    return NextResponse.json(
      { error: "Failed to delete genre" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, imageUrl, description } = body;

    const genre = await prisma.genre.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(imageUrl !== undefined && { imageUrl: imageUrl || null }),
        ...(description !== undefined && { description: description || null }),
      },
    });

    return NextResponse.json(genre);
  } catch (error) {
    console.error("Error updating genre:", error);
    return NextResponse.json(
      { error: "Failed to update genre" },
      { status: 500 }
    );
  }
}

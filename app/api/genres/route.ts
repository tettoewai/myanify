import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = (page - 1) * limit;

    // Execute count and data queries in parallel for better performance
    const [total, genres] = await Promise.all([
      prisma.genre.count(),
      prisma.genre.findMany({
        orderBy: { name: "asc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      data: genres,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching genres:", error);
    return NextResponse.json({ error: "Failed to fetch genres" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, imageUrl, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const genre = await prisma.genre.create({
      data: {
        name,
        imageUrl: imageUrl || null,
        description: description || null,
      },
    });

    return NextResponse.json(genre, { status: 201 });
  } catch (error) {
    console.error("Error creating genre:", error);
    return NextResponse.json(
      { error: "Failed to create genre" },
      { status: 500 }
    );
  }
}

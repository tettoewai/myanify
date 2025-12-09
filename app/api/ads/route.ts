import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { auth } from "@/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    // Check if user is admin - admins can see all ads
    const session = await auth();
    const isAdmin = session?.user?.role === "ADMIN";

    // Execute count and data queries in parallel for better performance
    const whereClause = isAdmin
      ? {} // Admin sees all ads
      : {
          isActive: true,
          OR: [{ endDate: null }, { endDate: { gte: new Date() } }],
        };

    const [total, ads] = await Promise.all([
      prisma.ad.count({ where: whereClause }),
      prisma.ad.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      data: ads,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching ads:", error);
    return NextResponse.json({ error: "Failed to fetch ads" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      imageUrl,
      linkUrl,
      sponsor,
      isActive,
      startDate,
      endDate,
    } = body;

    if (!title || !linkUrl || !sponsor) {
      return NextResponse.json(
        { error: "Title, linkUrl, and sponsor are required" },
        { status: 400 }
      );
    }

    const ad = await prisma.ad.create({
      data: {
        title,
        description: description || null,
        imageUrl: imageUrl || null,
        linkUrl,
        sponsor,
        isActive: isActive !== undefined ? isActive : true,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    return NextResponse.json(ad, { status: 201 });
  } catch (error) {
    console.error("Error creating ad:", error);
    return NextResponse.json(
      { error: "Failed to create ad" },
      { status: 500 }
    );
  }
}
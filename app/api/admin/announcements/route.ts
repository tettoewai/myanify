import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { notifyAnnouncement } from "@/lib/notifications";

function requireAdmin(session: unknown) {
  const s = session as { user?: { role?: string } } | null;
  return !!s?.user && s.user.role === "ADMIN";
}

// GET /api/admin/announcements — full list for admin (incl. inactive/scheduled).
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get("limit") || "20"), 1),
      100,
    );
    const search = searchParams.get("search") || undefined;
    const skip = (page - 1) * limit;

    const where =
      search && search.length > 0
        ? {
            OR: [
              { title: { contains: search, mode: "insensitive" as const } },
              { body: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {};

    const [total, items] = await Promise.all([
      prisma.announcement.count({ where }),
      prisma.announcement.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
        include: { _count: { select: { reads: true } } },
      }),
    ]);

    return NextResponse.json({
      data: items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error listing announcements:", error);
    return NextResponse.json(
      { error: "Failed to list announcements" },
      { status: 500 },
    );
  }
}

// POST /api/admin/announcements — create.
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!requireAdmin(session)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const body = await request.json();
    const { title, body: text, imageUrl, linkUrl, audience, startsAt, endsAt, isActive } = body ?? {};

    if (!title || typeof title !== "string" || !text || typeof text !== "string") {
      return NextResponse.json(
        { error: "title and body are required" },
        { status: 400 },
      );
    }
    if (audience && !["ALL", "FREE", "PREMIUM"].includes(audience)) {
      return NextResponse.json({ error: "Invalid audience" }, { status: 400 });
    }

    const created = await prisma.announcement.create({
      data: {
        title: title.trim(),
        body: text,
        imageUrl: imageUrl || null,
        linkUrl: linkUrl || null,
        audience: audience ?? "ALL",
        startsAt: startsAt ? new Date(startsAt) : new Date(),
        endsAt: endsAt ? new Date(endsAt) : null,
        isActive: isActive !== undefined ? !!isActive : true,
        createdBy: (session as { user?: { id?: string } })?.user?.id ?? null,
      },
    });
    if (created.isActive) {
      void notifyAnnouncement(created.id, created.title, created.body, created.audience);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating announcement:", error);
    return NextResponse.json(
      { error: "Failed to create announcement" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * GET /api/admin/plans
 * Get all plans (admin) or active ones (users)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    // Check if user is admin
    const isAdmin = session?.user?.role === "ADMIN";

    const where: any = {};

    // Non-admin users can only see active plans
    if (!isAdmin || activeOnly) {
      where.isActive = true;
    }

    const plans = await prisma.plan.findMany({
      where,
      orderBy: [
        { price: "asc" },
      ],
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch plans" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/plans
 * Create a new plan (admin only)
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      description,
      price,
      type,
      features,
      isActive,
    } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    // Calculate duration based on type
    let duration = 30; // Default MONTHLY
    if (type === "YEARLY") duration = 365;
    if (type === "LIFETIME") duration = 36500; // ~100 years

    const plan = await prisma.plan.create({
      data: {
        name,
        description: description || null,
        price: parseFloat(price),
        duration,
        type: type || "MONTHLY",
        features: features || [],
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    console.error("Error creating plan:", error);
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    );
  }
}

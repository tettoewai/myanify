import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * GET /api/admin/plans/[id]
 * Get a specific plan
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const plan = await prisma.plan.findUnique({
      where: { id },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Non-admin users can only see active plans
    if (!session?.user || session.user.role !== "ADMIN") {
      if (!plan.isActive) {
        return NextResponse.json(
          { error: "Plan not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error fetching plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/plans/[id]
 * Update a plan (admin only)
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
    const {
      name,
      description,
      price,
      type,
      features,
      isActive,
    } = body;

    // Validate plan exists
    const existing = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    // Calculate duration if type is being updated
    let duration = undefined;
    if (type) {
      if (type === "MONTHLY") duration = 30;
      else if (type === "YEARLY") duration = 365;
      else if (type === "LIFETIME") duration = 36500;
    }

    const updatedPlan = await prisma.plan.update({
      where: { id },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        price: price !== undefined ? parseFloat(price) : undefined,
        duration: duration,
        type: type !== undefined ? type : undefined,
        features: features !== undefined ? features : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({ plan: updatedPlan });
  } catch (error) {
    console.error("Error updating plan:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/plans/[id]
 * Delete a plan (admin only)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    // Check if plan exists
    const existing = await prisma.plan.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      );
    }

    await prisma.plan.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Plan deleted successfully" });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * GET /api/admin/payment-methods/[id]
 * Get a specific payment method
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    const paymentMethod = await prisma.paymentMethod.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!paymentMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // Non-admin users can only see active payment methods
    if (!session?.user || session.user.role !== "ADMIN") {
      if (!paymentMethod.isActive) {
        return NextResponse.json(
          { error: "Payment method not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json({ paymentMethod });
  } catch (error) {
    console.error("Error fetching payment method:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment method" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/payment-methods/[id]
 * Update a payment method (admin only)
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
      type,
      accountName,
      accountNumber,
      qrCodeUrl,
      instructions,
      isActive,
      displayOrder,
    } = body;

    // Validate payment method exists
    const existing = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // Validate type if provided
    if (type) {
      const validTypes = ["BANK", "MOBILE_MONEY", "E_WALLET", "OTHER"];
      if (!validTypes.includes(type)) {
        return NextResponse.json(
          { error: `Type must be one of: ${validTypes.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (accountName !== undefined) updateData.accountName = accountName;
    if (accountNumber !== undefined) updateData.accountNumber = accountNumber;
    if (qrCodeUrl !== undefined) updateData.qrCodeUrl = qrCodeUrl;
    if (instructions !== undefined) updateData.instructions = instructions;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;

    const paymentMethod = await prisma.paymentMethod.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: "Payment method updated successfully",
      paymentMethod,
    });
  } catch (error) {
    console.error("Error updating payment method:", error);
    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/payment-methods/[id]
 * Delete a payment method (admin only)
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

    const existing = await prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    await prisma.paymentMethod.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Payment method deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}

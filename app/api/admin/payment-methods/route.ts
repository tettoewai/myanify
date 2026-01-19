import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * GET /api/admin/payment-methods
 * Get all payment methods (admin) or active ones (users)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    // Check if user is admin
    const isAdmin = session?.user?.role === "ADMIN";

    const where: any = {};
    
    // Non-admin users can only see active payment methods
    if (!isAdmin || activeOnly) {
      where.isActive = true;
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({ paymentMethods });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/payment-methods
 * Create a new payment method (admin only)
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
      type,
      accountName,
      accountNumber,
      qrCodeUrl,
      instructions,
      isActive,
      displayOrder,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Validate payment method type
    const validTypes = ["BANK", "MOBILE_MONEY", "E_WALLET", "OTHER"];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        name,
        type,
        accountName: accountName || null,
        accountNumber: accountNumber || null,
        qrCodeUrl: qrCodeUrl || null,
        instructions: instructions || null,
        isActive: isActive !== undefined ? isActive : true,
        displayOrder: displayOrder || 0,
        createdById: session.user.id,
      },
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
      message: "Payment method created successfully",
      paymentMethod,
    });
  } catch (error) {
    console.error("Error creating payment method:", error);
    return NextResponse.json(
      { error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}

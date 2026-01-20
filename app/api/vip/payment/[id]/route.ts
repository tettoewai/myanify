import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { activateVIPSubscription } from "@/lib/vip-subscription";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

/**
 * GET /api/vip/payment/[id]
 * Get specific payment request
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

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        paymentMethod: {
          select: {
            id: true,
            name: true,
            type: true,
            accountName: true,
            accountNumber: true,
          },
        },
      },
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    // Users can only view their own requests unless admin
    if (paymentRequest.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    return NextResponse.json({ paymentRequest });
  } catch (error) {
    console.error("Error fetching payment request:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment request" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/vip/payment/[id]
 * Admin: Approve or reject payment request
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
    const { action, notes, adminPassword } = body; // action: "approve" | "reject"

    if (!action || (action !== "approve" && action !== "reject")) {
      return NextResponse.json(
        { error: "Action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (!adminPassword) {
      return NextResponse.json(
        { error: "Admin password is required for this action" },
        { status: 400 }
      );
    }

    // Verify admin password
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!adminUser || !adminUser.passwordHash) {
      return NextResponse.json(
        { error: "Admin account not configured for password verification" },
        { status: 403 }
      );
    }

    const passwordValid = await bcrypt.compare(adminPassword, adminUser.passwordHash);

    if (!passwordValid) {
      return NextResponse.json(
        { error: "Invalid admin password" },
        { status: 403 }
      );
    }

    const paymentRequest = await prisma.paymentRequest.findUnique({
      where: { id },
    });

    if (!paymentRequest) {
      return NextResponse.json(
        { error: "Payment request not found" },
        { status: 404 }
      );
    }

    if (paymentRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `Payment request is already ${paymentRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    if (action === "approve") {
      // Activate VIP subscription
      await activateVIPSubscription(
        paymentRequest.userId,
        paymentRequest.planType
      );

      // Update payment request
      const updated = await prisma.paymentRequest.update({
        where: { id },
        data: {
          status: "VERIFIED",
          verifiedBy: session.user.id,
          verifiedAt: new Date(),
          notes: notes || null,
        },
      });

      return NextResponse.json({
        message: "Payment verified and VIP subscription activated",
        paymentRequest: updated,
      });
    } else {
      // Reject payment
      const updated = await prisma.paymentRequest.update({
        where: { id },
        data: {
          status: "REJECTED",
          verifiedBy: session.user.id,
          verifiedAt: new Date(),
          rejectedReason: notes || "Payment verification failed",
        },
      });

      return NextResponse.json({
        message: "Payment request rejected",
        paymentRequest: updated,
      });
    }
  } catch (error) {
    console.error("Error updating payment request:", error);
    return NextResponse.json(
      { error: "Failed to update payment request" },
      { status: 500 }
    );
  }
}

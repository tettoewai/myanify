import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * GET /api/vip/payment
 * Get user's payment requests
 */
export async function GET(request: Request) {
    try {
        const session = await getSession();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status");

        const where: any = { userId: session.user.id };
        if (status) {
            where.status = status.toUpperCase();
        }

        const paymentRequests = await prisma.paymentRequest.findMany({
            where,
            include: {
                paymentMethod: true,
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json({ paymentRequests });
    } catch (error) {
        console.error("Error fetching payment requests:", error);
        return NextResponse.json(
            { error: "Failed to fetch payment requests" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/vip/payment/submit
 * Submit payment proof (transaction ID and optional screenshot)
 */
export async function POST(request: Request) {
    try {
        const session = await getSession();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { paymentRequestId, transactionId, proofImageUrl } = body;

        if (!paymentRequestId || !transactionId) {
            return NextResponse.json(
                { error: "Payment request ID and transaction ID are required" },
                { status: 400 }
            );
        }

        // Verify payment request belongs to user
        const paymentRequest = await prisma.paymentRequest.findFirst({
            where: {
                id: paymentRequestId,
                userId: session.user.id,
            },
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

        // Update payment request with transaction details
        const updated = await prisma.paymentRequest.update({
            where: { id: paymentRequestId },
            data: {
                transactionId,
                proofImageUrl: proofImageUrl || null,
            },
        });

        return NextResponse.json({
            message: "Payment proof submitted successfully",
            paymentRequest: updated,
        });
    } catch (error) {
        console.error("Error submitting payment proof:", error);
        return NextResponse.json(
            { error: "Failed to submit payment proof" },
            { status: 500 }
        );
    }
}

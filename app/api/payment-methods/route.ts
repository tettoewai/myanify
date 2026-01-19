import { NextResponse } from "next/server";
import { prisma } from "@/db";

/**
 * GET /api/payment-methods
 * Get active payment methods (public endpoint for users to see payment options)
 */
export async function GET() {
    try {
        const paymentMethods = await prisma.paymentMethod.findMany({
            where: {
                isActive: true,
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

import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * GET /api/vip/payment/admin
 * Admin: Get all payment requests (with filtering)
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) {
      where.status = status.toUpperCase();
    }

    const [total, paymentRequests] = await Promise.all([
      prisma.paymentRequest.count({ where }),
      prisma.paymentRequest.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              avatarUrl: true,
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
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
    ]);

    return NextResponse.json({
      data: paymentRequests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching payment requests:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment requests" },
      { status: 500 }
    );
  }
}

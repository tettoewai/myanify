import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      total,
      vipCount,
      adminCount,
      newThisWeek,
      newThisMonth,
      verifiedCount,
      activeSubs,
      pendingPayments,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isPremium: true } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: monthAgo } } }),
      prisma.user.count({ where: { emailVerified: { not: null } } }),
      prisma.premiumSubscription.count({ where: { status: "ACTIVE" } }),
      prisma.paymentRequest.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      total,
      vip: vipCount,
      free: total - vipCount,
      admins: adminCount,
      listeners: total - adminCount,
      newThisWeek,
      newThisMonth,
      verified: verifiedCount,
      unverified: total - verifiedCount,
      activeSubscriptions: activeSubs,
      pendingPayments,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch user stats" },
      { status: 500 }
    );
  }
}

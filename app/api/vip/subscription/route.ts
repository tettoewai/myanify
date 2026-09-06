import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { generatePaymentReference, VIP_PLANS } from "@/lib/vip-subscription";
import { getDownloadSettings } from "@/lib/download-settings";
import { withRetry } from "@/db";
import { PlanType } from "@prisma/client";

/**
 * GET /api/vip/subscription
 * Get current user's VIP subscription status.
 * Uses User.isPremium directly for a fast, reliable check.
 */
export async function GET() {
    try {
        const session = await getSession();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const [subscription, user, downloadSettings] = await Promise.all([
            withRetry(() =>
                prisma.premiumSubscription.findUnique({
                    where: { userId: session.user.id },
                })
            ),
            withRetry(() =>
                prisma.user.findUnique({
                    where: { id: session.user.id },
                    select: { isPremium: true },
                })
            ),
            getDownloadSettings(),
        ]);

        return NextResponse.json({ subscription, isVIP: user?.isPremium ?? false, downloadSettings });
    } catch (error) {
        console.error("Error fetching subscription:", error);
        return NextResponse.json(
            { error: "Failed to fetch subscription" },
            { status: 500 }
        );
    }
}

/**
 * POST /api/vip/subscription
 * Request VIP subscription - generates payment reference
 */
export async function POST(request: Request) {
    try {
        const session = await getSession();

        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { planType, paymentMethodId, planId } = body;

        let amount = 0;
        let finalPlanType = planType;

        if (planId) {
            const dbPlan = await prisma.plan.findUnique({ where: { id: planId } });
            if (!dbPlan) {
                return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
            }
            amount = dbPlan.price;
            finalPlanType = dbPlan.type;
        } else {
            if (!planType || (planType !== PlanType.MONTHLY && planType !== PlanType.YEARLY)) {
                return NextResponse.json(
                    { error: "Invalid plan type. Must be MONTHLY or YEARLY" },
                    { status: 400 }
                );
            }
            const planConfig = planType === PlanType.MONTHLY ? VIP_PLANS.MONTHLY : VIP_PLANS.YEARLY;
            amount = planConfig.price;
        }

        const referenceNumber = generatePaymentReference();

        const existingPending = await prisma.paymentRequest.findFirst({
            where: {
                userId: session.user.id,
                status: "PENDING",
            },
        });

        if (existingPending) {
            return NextResponse.json({
                message: "You already have a pending payment request",
                paymentRequest: existingPending,
            });
        }

        const paymentMethods = await prisma.paymentMethod.findMany({
            where: {
                isActive: true,
            },
            orderBy: [
                { displayOrder: "asc" },
                { createdAt: "desc" },
            ],
        });

        let selectedPaymentMethod = null;
        if (paymentMethodId) {
            selectedPaymentMethod = await prisma.paymentMethod.findFirst({
                where: {
                    id: paymentMethodId,
                    isActive: true,
                },
            });
            if (!selectedPaymentMethod) {
                return NextResponse.json(
                    { error: "Invalid payment method" },
                    { status: 400 }
                );
            }
        }

        const paymentRequest = await prisma.paymentRequest.create({
            data: {
                userId: session.user.id,
                planType: finalPlanType,
                amount,
                referenceNumber,
                status: "PENDING",
                paymentMethodId: paymentMethodId || null,
                planId: planId || null,
            },
        });

        return NextResponse.json({
            message: "Payment request created",
            paymentRequest,
            paymentMethods,
            selectedPaymentMethod,
            instructions: {
                amount,
                referenceNumber,
                steps: [
                    "1. Complete payment via one of the payment methods below using the reference number above",
                    "2. Submit your transaction ID and proof (optional screenshot)",
                    "3. Wait for admin verification (usually within 24 hours)",
                    "4. Your VIP subscription will be activated automatically upon approval",
                ],
            },
        });
    } catch (error) {
        console.error("Error creating payment request:", error);
        return NextResponse.json(
            { error: "Failed to create payment request" },
            { status: 500 }
        );
    }
}

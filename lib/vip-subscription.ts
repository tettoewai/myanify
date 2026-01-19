import { SubscriptionStatus, PlanType } from "@prisma/client";
import { prisma } from "@/db";

export const VIP_PLANS = {
    MONTHLY: {
        type: PlanType.MONTHLY,
        price: 9.99,
        durationDays: 30,
    },
    YEARLY: {
        type: PlanType.YEARLY,
        price: 99.99,
        durationDays: 365,
    },
} as const;

/**
 * Generates a unique payment reference number
 */
export function generatePaymentReference(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `MYANIFY-${timestamp}-${random}`;
}

/**
 * Checks if a user has an active VIP subscription
 */
export async function isUserVIP(userId: string): Promise<boolean> {
    const subscription = await prisma.premiumSubscription.findUnique({
        where: { userId },
    });

    if (!subscription) {
        return false;
    }

    // Check if subscription is active and not expired
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
        return false;
    }

    // Check expiration date
    if (subscription.endDate && subscription.endDate < new Date()) {
        // Update status to expired
        await prisma.premiumSubscription.update({
            where: { userId },
            data: { status: SubscriptionStatus.EXPIRED },
        });
        return false;
    }

    return true;
}

/**
 * Activates VIP subscription for a user
 */
export async function activateVIPSubscription(
    userId: string,
    planType: PlanType
): Promise<void> {
    const planConfig = planType === PlanType.MONTHLY ? VIP_PLANS.MONTHLY : VIP_PLANS.YEARLY;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planConfig.durationDays);

    // Check if user already has a subscription
    const existing = await prisma.premiumSubscription.findUnique({
        where: { userId },
    });

    if (existing) {
        // Update existing subscription
        const currentEndDate = existing.endDate || new Date();
        const newEndDate = new Date(Math.max(currentEndDate.getTime(), Date.now()));
        newEndDate.setDate(newEndDate.getDate() + planConfig.durationDays);

        await prisma.premiumSubscription.update({
            where: { userId },
            data: {
                status: SubscriptionStatus.ACTIVE,
                planType,
                startDate: new Date(),
                endDate: newEndDate,
                cancelAtPeriodEnd: false,
            },
        });
    } else {
        // Create new subscription
        await prisma.premiumSubscription.create({
            data: {
                userId,
                status: SubscriptionStatus.ACTIVE,
                planType,
                startDate: new Date(),
                endDate,
            },
        });
    }

    // Update user's isPremium flag
    await prisma.user.update({
        where: { id: userId },
        data: { isPremium: true },
    });
}

/**
 * Gets user's subscription information
 */
export async function getUserSubscription(userId: string) {
    return await prisma.premiumSubscription.findUnique({
        where: { userId },
    });
}

/**
 * Checks download limits for VIP users
 */
export const DOWNLOAD_LIMITS = {
    MAX_SONGS: 100,
    MAX_DEVICES: 3,
} as const;

export async function canUserDownload(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    const isVIP = await isUserVIP(userId);

    if (!isVIP) {
        return { allowed: false, reason: 'VIP subscription required for offline downloads' };
    }

    // Check download count
    const downloadCount = await prisma.offlineDownload.count({
        where: {
            userId,
            downloadStatus: { in: ['COMPLETED', 'DOWNLOADING'] },
        },
    });

    if (downloadCount >= DOWNLOAD_LIMITS.MAX_SONGS) {
        return { allowed: false, reason: `Download limit reached (max ${DOWNLOAD_LIMITS.MAX_SONGS} songs)` };
    }

    return { allowed: true };
}

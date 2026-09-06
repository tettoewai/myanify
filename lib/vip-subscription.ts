import { SubscriptionStatus, PlanType } from "@prisma/client";
import { prisma } from "@/db";
import { getDownloadSettings } from "@/lib/download-settings";

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
 * Reconcile User.isPremium against the subscription table and expire stale
 * rows/downloads. Maintenance only (cron/admin) — request paths must check
 * User.isPremium directly and never call this per request.
 * Returns the resulting premium flag.
 */
export async function syncUserVIPFlag(userId: string): Promise<boolean> {
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
        // Immediate offline block: expire all active downloads so clients
        // that poll /vip/downloads or /vip/subscription stop playback.
        await prisma.offlineDownload.updateMany({
            where: {
                userId,
                downloadStatus: { in: ["PENDING", "DOWNLOADING", "COMPLETED"] },
            },
            data: { downloadStatus: "EXPIRED" },
        });
        // Clear premium flag so song-level premium gates also close.
        await prisma.user.updateMany({
            where: { id: userId, isPremium: true },
            data: { isPremium: false },
        });
        return false;
    }

    return true;
}

/**
 * Force-expire a user's offline downloads (e.g. admin revokes VIP).
 * Returns number of rows expired.
 */
export async function expireUserDownloads(userId: string): Promise<number> {
    const result = await prisma.offlineDownload.updateMany({
        where: {
            userId,
            downloadStatus: { in: ["PENDING", "DOWNLOADING", "COMPLETED"] },
        },
        data: { downloadStatus: "EXPIRED" },
    });
    return result.count;
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
 * Checks download limits for users.
 * Respects admin-configurable settings:
 * - download_require_vip (default true): when false, non-VIP may download.
 * - download_max_songs (default 100): per-user cap on active downloads.
 */
export const DOWNLOAD_LIMITS = {
    MAX_SONGS: 100,
    MAX_DEVICES: 3,
} as const;

export async function canUserDownload(userId: string, isPremium: boolean): Promise<{ allowed: boolean; reason?: string; maxSongs?: number; requireVip?: boolean }> {
    const settings = await getDownloadSettings();

    if (settings.requireVip && !isPremium) {
        return { allowed: false, reason: 'VIP subscription required for offline downloads', maxSongs: settings.maxSongs, requireVip: true };
    }

    // Check download count
    const downloadCount = await prisma.offlineDownload.count({
        where: {
            userId,
            downloadStatus: { in: ['COMPLETED', 'DOWNLOADING'] },
        },
    });

    if (downloadCount >= settings.maxSongs) {
        return { allowed: false, reason: `Download limit reached (max ${settings.maxSongs} songs)`, maxSongs: settings.maxSongs, requireVip: settings.requireVip };
    }

    return { allowed: true, maxSongs: settings.maxSongs, requireVip: settings.requireVip };
}

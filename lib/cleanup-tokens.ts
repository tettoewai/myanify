import { prisma } from "./prisma";

export async function cleanupExpiredTokens() {
  try {
    const now = new Date();

    // Clean up users with expired verification tokens that are older than 7 days
    const expiredUsers = await prisma.user.findMany({
      where: {
        emailVerified: null,
        verificationTokenExpiry: {
          lt: now,
        },
        createdAt: {
          lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      },
    });

    // Optionally delete or archive these users
    for (const user of expiredUsers) {
      await prisma.user.delete({
        where: { id: user.id },
      });
    }

    console.log(
      `Cleaned up ${expiredUsers.length} expired verification tokens`,
    );
  } catch (error) {
    console.error("Cleanup error:", error);
  }
}

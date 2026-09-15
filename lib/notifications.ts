import { Expo, ExpoPushMessage } from "expo-server-sdk";
import { prisma } from "@/db";
import { getNotificationSettings } from "@/lib/notification-settings";

let expo: Expo | null = null;

function getExpo(): Expo | null {
  if (expo) return expo;
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (!accessToken) {
    console.warn(
      "[notifications] EXPO_ACCESS_TOKEN not set — push notifications disabled",
    );
    return null;
  }
  expo = new Expo({ accessToken });
  return expo;
}

/**
 * Send push notifications. Deactivates invalid tokens (DeviceNotRegistered
 * and other terminal errors) so they stop accumulating. Fire-and-forget —
 * errors are logged but never thrown.
 */
async function sendBatch(messages: ExpoPushMessage[]) {
  if (messages.length === 0) return;
  const expo = getExpo();
  if (!expo) return;

  const chunks = expo.chunkPushNotifications(messages);

  for (const chunk of chunks) {
    let tickets;
    try {
      tickets = await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      console.error("[notifications] Chunk send error:", err);
      continue;
    }

    const tokensToDeactivate = new Set<string>();
    const receiptIdToToken = new Map<string, string>();

    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i];
      const token = chunk[i]?.to as string;

      if (ticket.status === "error") {
        console.error("[notifications] Push ticket error:", {
          token: redact(token),
          message: ticket.message,
          error: ticket.details?.error,
        });
        if (
          ticket.details?.error === "DeviceNotRegistered" ||
          ticket.details?.error === "InvalidCredentials"
        ) {
          tokensToDeactivate.add(token);
        }
        continue;
      }

      receiptIdToToken.set(ticket.id, token);
    }

    if (tokensToDeactivate.size > 0) {
      await deactivateTokens([...tokensToDeactivate]);
    }

    if (receiptIdToToken.size === 0) continue;

    try {
      const receipts = await expo.getPushNotificationReceiptsAsync([
        ...receiptIdToToken.keys(),
      ]);
      const invalidTokens = new Set<string>();
      for (const [receiptId, token] of receiptIdToToken) {
        const receipt = receipts[receiptId];
        if (
          receipt &&
          receipt.status === "error" &&
          (receipt.details?.error === "DeviceNotRegistered" ||
            receipt.details?.error === "InvalidCredentials")
        ) {
          invalidTokens.add(token);
        }
      }
      if (invalidTokens.size > 0) {
        await deactivateTokens([...invalidTokens]);
      }
    } catch (err) {
      console.error("[notifications] Receipt fetch error:", err);
    }
  }
}

function redact(token: string): string {
  return token.length > 12 ? `${token.slice(0, 8)}…${token.slice(-4)}` : token;
}

async function deactivateTokens(tokens: string[]) {
  try {
    await prisma.pushToken.updateMany({
      where: { token: { in: tokens } },
      data: { isActive: false },
    });
  } catch (err) {
    console.error("[notifications] Failed to deactivate invalid tokens:", err);
  }
}

/**
 * Build a push message for each of a user's active tokens, respecting a single
 * boolean preference. Skips users who have disabled the category.
 */
async function buildMessages(
  userIds: string[],
  preferenceKey: string,
  title: string,
  body: string,
  data: Record<string, string>,
): Promise<ExpoPushMessage[]> {
  if (userIds.length === 0) return [];

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      pushTokens: { where: { isActive: true }, select: { token: true } },
      notificationPreference: { select: { [preferenceKey]: true } },
    },
  });

  const messages: ExpoPushMessage[] = [];
  const expo = getExpo();

  for (const user of users) {
    const pref = user.notificationPreference as Record<string, unknown> | null;
    if (pref && pref[preferenceKey] === false) continue;

    for (const { token } of user.pushTokens) {
      if (!expo || !Expo.isExpoPushToken(token)) continue;
      messages.push({
        to: token,
        title,
        body,
        data,
        sound: "default",
      });
    }
  }

  return messages;
}

/**
 * Notify users about a new song.
 * When newSongsOnlyLiked is true (default), targets only users who follow at least one of the song's artists.
 * When newSongsOnlyLiked is false, targets all users with active push tokens.
 */
export async function notifyNewSong(
  songId: string,
  title: string,
  englishTitle: string | null,
  artistNames: string[],
  _coverUrl: string | null,
  artistIds: string[],
) {
  try {
    const settings = await getNotificationSettings();
    if (!settings.newSongs) return;

    let userIds: string[];

    if (settings.newSongsOnlyLiked) {
      if (artistIds.length === 0) return;

      const followers = await prisma.likedArtist.findMany({
        where: { artistId: { in: artistIds } },
        select: { userId: true },
      });

      userIds = [...new Set(followers.map((f) => f.userId))];
    } else {
      const tokens = await prisma.pushToken.findMany({
        where: { isActive: true },
        select: { userId: true },
      });
      userIds = [...new Set(tokens.map((t) => t.userId))];
    }

    const displayArtist = artistNames.join(", ");
    const displayTitle = englishTitle || title;

    const messages = await buildMessages(
      userIds,
      "newSongs",
      `New song by ${displayArtist}`,
      `${displayTitle} is now available`,
      { type: "new_song", songId },
    );

    await sendBatch(messages);
  } catch (err) {
    console.error("[notifications] notifyNewSong error:", err);
  }
}

/**
 * Notify all users about a new album.
 */
export async function notifyNewAlbum(
  albumId: string,
  name: string,
  englishName: string | null,
  _coverUrl: string | null,
) {
  try {
    const settings = await getNotificationSettings();
    if (!settings.newAlbums) return;

    const tokens = await prisma.pushToken.findMany({
      where: { isActive: true },
      select: { userId: true, token: true },
    });
    if (tokens.length === 0) return;

    const userIds = [...new Set(tokens.map((t) => t.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, notificationPreference: { select: { newAlbums: true } } },
    });

    const allowedIds = new Set(
      users
        .filter((u) => u.notificationPreference?.newAlbums !== false)
        .map((u) => u.id),
    );

    const expoInst = getExpo();
    const messages: ExpoPushMessage[] = [];
    for (const { userId, token } of tokens) {
      if (!allowedIds.has(userId) || !expoInst || !Expo.isExpoPushToken(token)) continue;
      messages.push({
        to: token,
        title: "New album available",
        body: `${englishName || name} is now on Myanify`,
        data: { type: "new_album", albumId },
        sound: "default",
      });
    }

    await sendBatch(messages);
  } catch (err) {
    console.error("[notifications] notifyNewAlbum error:", err);
  }
}

/**
 * Notify a specific user about their song request status change.
 */
export async function notifySongRequestUpdate(
  userId: string,
  status: "APPROVED" | "REJECTED",
  songTitle: string,
) {
  try {
    const settings = await getNotificationSettings();
    if (!settings.songRequestUpdates) return;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        pushTokens: { where: { isActive: true }, select: { token: true } },
        notificationPreference: { select: { songRequestUpdates: true } },
      },
    });

    if (!user || user.notificationPreference?.songRequestUpdates === false) return;

    const expoInst = getExpo();
    const messages: ExpoPushMessage[] = [];
    for (const { token } of user.pushTokens) {
      if (!expoInst || !Expo.isExpoPushToken(token)) continue;
      messages.push({
        to: token,
        title: status === "APPROVED" ? "Song request approved" : "Song request update",
        body:
          status === "APPROVED"
            ? `Your request "${songTitle}" has been approved!`
            : `Your request "${songTitle}" was not approved this time.`,
        data: { type: "song_request", status },
        sound: "default",
      });
    }

    await sendBatch(messages);
  } catch (err) {
    console.error("[notifications] notifySongRequestUpdate error:", err);
  }
}

/**
 * Notify users based on announcement audience targeting.
 */
export async function notifyAnnouncement(
  announcementId: string,
  title: string,
  body: string,
  audience: string,
) {
  try {
    const settings = await getNotificationSettings();
    if (!settings.announcements) return;

    const where: Record<string, unknown> = {};
    if (audience === "FREE") where.isPremium = false;
    else if (audience === "PREMIUM") where.isPremium = true;

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        pushTokens: { where: { isActive: true }, select: { token: true } },
        notificationPreference: { select: { announcements: true } },
      },
    });

    const expoInst = getExpo();
    const messages: ExpoPushMessage[] = [];
    for (const user of users) {
      if (user.notificationPreference?.announcements === false) continue;
      for (const { token } of user.pushTokens) {
        if (!expoInst || !Expo.isExpoPushToken(token)) continue;
        messages.push({
          to: token,
          title,
          body: body.length > 100 ? body.slice(0, 97) + "..." : body,
          data: { type: "announcement", announcementId },
          sound: "default",
        });
      }
    }

    await sendBatch(messages);
  } catch (err) {
    console.error("[notifications] notifyAnnouncement error:", err);
  }
}
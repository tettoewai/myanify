import { prisma } from "@/db";

export const NOTIFICATION_SETTING_KEYS = {
  NEW_SONGS: "notification_new_songs_enabled",
  NEW_SONGS_ONLY_LIKED: "notification_new_songs_only_liked",
  NEW_ALBUMS: "notification_new_albums_enabled",
  SONG_REQUEST_UPDATES: "notification_song_request_updates_enabled",
  ANNOUNCEMENTS: "notification_announcements_enabled",
} as const;

export interface NotificationSettings {
  /** When true (default), new song notifications are sent. */
  newSongs: boolean;
  /** When true (default), only notify users who liked the artist. When false, notify all users. */
  newSongsOnlyLiked: boolean;
  /** When true (default), new album notifications are sent. */
  newAlbums: boolean;
  /** When true (default), song request update notifications are sent. */
  songRequestUpdates: boolean;
  /** When true (default), announcement notifications are sent. */
  announcements: boolean;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  newSongs: true,
  newSongsOnlyLiked: true,
  newAlbums: true,
  songRequestUpdates: true,
  announcements: true,
};

/** Parse raw DB value into safe settings. Missing/invalid -> default (enabled). */
export function normalizeNotificationSettings(
  raw: Partial<Record<string, string | null | undefined>>,
): NotificationSettings {
  const parseBool = (key: string, fallback: boolean): boolean => {
    const rawVal = (raw[key] ?? "").toLowerCase();
    return rawVal === "" ? fallback : rawVal === "true";
  };

  return {
    newSongs: parseBool(NOTIFICATION_SETTING_KEYS.NEW_SONGS, DEFAULT_NOTIFICATION_SETTINGS.newSongs),
    newSongsOnlyLiked: parseBool(NOTIFICATION_SETTING_KEYS.NEW_SONGS_ONLY_LIKED, DEFAULT_NOTIFICATION_SETTINGS.newSongsOnlyLiked),
    newAlbums: parseBool(NOTIFICATION_SETTING_KEYS.NEW_ALBUMS, DEFAULT_NOTIFICATION_SETTINGS.newAlbums),
    songRequestUpdates: parseBool(NOTIFICATION_SETTING_KEYS.SONG_REQUEST_UPDATES, DEFAULT_NOTIFICATION_SETTINGS.songRequestUpdates),
    announcements: parseBool(NOTIFICATION_SETTING_KEYS.ANNOUNCEMENTS, DEFAULT_NOTIFICATION_SETTINGS.announcements),
  };
}

let cached: { settings: NotificationSettings; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getNotificationSettings(): Promise<NotificationSettings> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.settings;
  }

  try {
    const rows = await prisma.appSetting.findMany({
      where: {
        key: {
          in: Object.values(NOTIFICATION_SETTING_KEYS),
        },
      },
    });
    const raw: Record<string, string> = {};
    for (const row of rows) raw[row.key] = row.value;
    const settings = normalizeNotificationSettings(raw);
    cached = { settings, at: Date.now() };
    return settings;
  } catch {
    return { ...DEFAULT_NOTIFICATION_SETTINGS };
  }
}

export function invalidateNotificationSettingsCache(): void {
  cached = null;
}

export async function updateNotificationSettings(
  input: Partial<NotificationSettings>,
  updatedById?: string,
): Promise<NotificationSettings> {
  const current = await getNotificationSettings();
  const next: NotificationSettings = {
    newSongs: input.newSongs ?? current.newSongs,
    newSongsOnlyLiked: input.newSongsOnlyLiked ?? current.newSongsOnlyLiked,
    newAlbums: input.newAlbums ?? current.newAlbums,
    songRequestUpdates: input.songRequestUpdates ?? current.songRequestUpdates,
    announcements: input.announcements ?? current.announcements,
  };

  const upserts = [
    { key: NOTIFICATION_SETTING_KEYS.NEW_SONGS, value: String(next.newSongs) },
    { key: NOTIFICATION_SETTING_KEYS.NEW_SONGS_ONLY_LIKED, value: String(next.newSongsOnlyLiked) },
    { key: NOTIFICATION_SETTING_KEYS.NEW_ALBUMS, value: String(next.newAlbums) },
    { key: NOTIFICATION_SETTING_KEYS.SONG_REQUEST_UPDATES, value: String(next.songRequestUpdates) },
    { key: NOTIFICATION_SETTING_KEYS.ANNOUNCEMENTS, value: String(next.announcements) },
  ];

  for (const { key, value } of upserts) {
    await prisma.appSetting.upsert({
      where: { key },
      create: { key, value, updatedById },
      update: { value, updatedById },
    });
  }

  invalidateNotificationSettingsCache();
  return next;
}

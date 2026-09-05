import { prisma } from "@/db";

export const DOWNLOAD_SETTING_KEYS = {
  MAX_SONGS: "download_max_songs",
  REQUIRE_VIP: "download_require_vip",
} as const;

export interface DownloadSettings {
  /** Max offline songs per user. Default 100. */
  maxSongs: number;
  /** When false, non-VIP users may also download (still capped by maxSongs). Default true. */
  requireVip: boolean;
}

export const DEFAULT_DOWNLOAD_SETTINGS: DownloadSettings = {
  maxSongs: 100,
  requireVip: true,
};

/** Parse + clamp raw DB values into safe settings. */
export function normalizeDownloadSettings(
  raw: Partial<Record<string, string | null | undefined>>,
): DownloadSettings {
  const parsedMax = Number.parseInt(
    raw[DOWNLOAD_SETTING_KEYS.MAX_SONGS] ?? "",
    10,
  );
  const maxSongs =
    Number.isFinite(parsedMax) && parsedMax > 0
      ? Math.min(Math.floor(parsedMax), 10000)
      : DEFAULT_DOWNLOAD_SETTINGS.maxSongs;

  const rawVip = (raw[DOWNLOAD_SETTING_KEYS.REQUIRE_VIP] ?? "").toLowerCase();
  const requireVip =
    rawVip === "" ? DEFAULT_DOWNLOAD_SETTINGS.requireVip : rawVip === "true";

  return { maxSongs, requireVip };
}

let cached: { settings: DownloadSettings; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getDownloadSettings(): Promise<DownloadSettings> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.settings;
  }

  try {
    const rows = await prisma.appSetting.findMany({
      where: {
        key: {
          in: [DOWNLOAD_SETTING_KEYS.MAX_SONGS, DOWNLOAD_SETTING_KEYS.REQUIRE_VIP],
        },
      },
    });
    const raw: Record<string, string> = {};
    for (const row of rows) raw[row.key] = row.value;
    const settings = normalizeDownloadSettings(raw);
    cached = { settings, at: Date.now() };
    return settings;
  } catch {
    // DB unreachable (cold start) — fall back to defaults rather than 500.
    return { ...DEFAULT_DOWNLOAD_SETTINGS };
  }
}

export function invalidateDownloadSettingsCache(): void {
  cached = null;
}

export async function updateDownloadSettings(
  input: Partial<DownloadSettings>,
  updatedById?: string,
): Promise<DownloadSettings> {
  const current = await getDownloadSettings();
  const next: DownloadSettings = {
    maxSongs:
      input.maxSongs !== undefined
        ? Math.min(Math.max(Math.floor(input.maxSongs), 1), 10000)
        : current.maxSongs,
    requireVip: input.requireVip ?? current.requireVip,
  };

  if (!Number.isFinite(next.maxSongs)) {
    throw new Error("maxSongs must be a number between 1 and 10000");
  }

  await prisma.appSetting.upsert({
    where: { key: DOWNLOAD_SETTING_KEYS.MAX_SONGS },
    create: {
      key: DOWNLOAD_SETTING_KEYS.MAX_SONGS,
      value: String(next.maxSongs),
      updatedById,
    },
    update: { value: String(next.maxSongs), updatedById },
  });
  await prisma.appSetting.upsert({
    where: { key: DOWNLOAD_SETTING_KEYS.REQUIRE_VIP },
    create: {
      key: DOWNLOAD_SETTING_KEYS.REQUIRE_VIP,
      value: String(next.requireVip),
      updatedById,
    },
    update: { value: String(next.requireVip), updatedById },
  });

  invalidateDownloadSettingsCache();
  return next;
}

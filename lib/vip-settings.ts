import { prisma } from "@/db";

export const VIP_SETTING_KEYS = {
  ENABLED: "vip_enabled",
} as const;

export interface VIPSettings {
  /**
   * When true (default), VIP gating is active — only User.isPremium users
   * get premium features. When false, VIP is turned off and EVERYONE gets
   * VIP features for free.
   */
  enabled: boolean;
}

export const DEFAULT_VIP_SETTINGS: VIPSettings = {
  enabled: true,
};

/** Parse raw DB value into safe settings. Missing/invalid -> default (enabled). */
export function normalizeVIPSettings(
  raw: Partial<Record<string, string | null | undefined>>,
): VIPSettings {
  const rawEnabled = (raw[VIP_SETTING_KEYS.ENABLED] ?? "").toLowerCase();
  const enabled =
    rawEnabled === "" ? DEFAULT_VIP_SETTINGS.enabled : rawEnabled === "true";
  return { enabled };
}

let cached: { settings: VIPSettings; at: number } | null = null;
const CACHE_TTL_MS = 30_000;

export async function getVIPSettings(): Promise<VIPSettings> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.settings;
  }

  try {
    const row = await prisma.appSetting.findUnique({
      where: { key: VIP_SETTING_KEYS.ENABLED },
    });
    const settings = normalizeVIPSettings({
      [VIP_SETTING_KEYS.ENABLED]: row?.value,
    });
    cached = { settings, at: Date.now() };
    return settings;
  } catch {
    // DB unreachable (cold start) — fall back to defaults rather than 500.
    return { ...DEFAULT_VIP_SETTINGS };
  }
}

export function invalidateVIPSettingsCache(): void {
  cached = null;
}

export async function updateVIPSettings(
  input: Partial<VIPSettings>,
  updatedById?: string,
): Promise<VIPSettings> {
  const current = await getVIPSettings();
  const next: VIPSettings = {
    enabled: input.enabled ?? current.enabled,
  };

  await prisma.appSetting.upsert({
    where: { key: VIP_SETTING_KEYS.ENABLED },
    create: {
      key: VIP_SETTING_KEYS.ENABLED,
      value: String(next.enabled),
      updatedById,
    },
    update: { value: String(next.enabled), updatedById },
  });

  invalidateVIPSettingsCache();
  return next;
}

/**
 * Effective VIP flag for a user.
 * When VIP is disabled globally, everyone counts as VIP.
 */
export async function getEffectiveIsPremium(
  userIsPremium: boolean,
): Promise<boolean> {
  if (userIsPremium) return true;
  const settings = await getVIPSettings();
  if (!settings.enabled) return true;
  return false;
}

/** Synchronous version when settings are already loaded. */
export function resolveEffectiveIsPremium(
  userIsPremium: boolean,
  vipEnabled: boolean,
): boolean {
  if (!vipEnabled) return true;
  return userIsPremium;
}

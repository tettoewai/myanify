/**
 * Shared mobile-release manifest helpers.
 *
 * Source of truth for GET /api/mobile-update shape, validation,
 * canonical signing payload (Ed25519 via tweetnacl), and APK URL allowlist.
 *
 * Rules (free, no Play Store):
 * - apkUrl MUST be a GitHub Release asset under RELEASE_REPO
 *   (default: tettoewai/myanify-releases). This bounds the blast radius of
 *   a compromised manifest to "attacker must also write to your releases".
 * - Manifests SHOULD carry an Ed25519 `signature` over the canonical payload.
 *   Clients verify with EXPO_PUBLIC_RELEASE_PUBLIC_KEY and reject unsigned
 *   manifests once a public key is configured (fail-closed upgrade path).
 */

export interface MobileReleaseManifest {
  version: string;
  versionCode: number;
  apkUrl: string;
  notes: string;
  mandatory: boolean;
  sha256?: string;
  md5?: string;
  fileSize?: number;
  /** Below this installed versionCode, update is treated as mandatory. */
  minVersionCode?: number;
  /** Staged rollout 0-100 (% of devices eligible). Undefined/100 = everyone. */
  rollout?: number;
  /** Signing-cert SHA-256 fingerprint (apksigner --print-certs), for manual verification. */
  certSha256?: string;
  /** Rollback target (previous known-good release). */
  previousVersion?: string;
  previousVersionCode?: number;
  previousApkUrl?: string;
  /** Base64 Ed25519 detached signature over canonical payload. */
  signature?: string;
}

export function getReleaseRepo(): string {
  return (
    process.env.RELEASE_REPO?.trim() || "tettoewai/myanify-releases"
  ).replace(/\/$/, "");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Strict allowlist: https://github.com/<repo>/releases/download/<tag>/<file>.apk */
export function isAllowedApkUrl(apkUrl: string, repo = getReleaseRepo()): boolean {
  if (!/^https:\/\//.test(apkUrl)) return false;
  let u: URL;
  try {
    u = new URL(apkUrl);
  } catch {
    return false;
  }
  if (u.hostname !== "github.com") return false;
  const pattern = new RegExp(
    `^/${escapeRegExp(repo)}/releases/download/[^/]+/[^/]+\\.apk(\\?.*)?$`,
  );
  return pattern.test(u.pathname);
}

export function validateManifest(raw: unknown): MobileReleaseManifest | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.version !== "string" || !m.version) return null;
  if (typeof m.versionCode !== "number" || !Number.isFinite(m.versionCode)) return null;
  if (typeof m.apkUrl !== "string" || !m.apkUrl) return null;
  if (!isAllowedApkUrl(m.apkUrl)) return null;
  if (m.notes !== undefined && typeof m.notes !== "string") return null;
  if (m.mandatory !== undefined && typeof m.mandatory !== "boolean") return null;
  if (m.sha256 !== undefined && typeof m.sha256 !== "string") return null;
  if (m.md5 !== undefined && typeof m.md5 !== "string") return null;
  if (m.fileSize !== undefined && typeof m.fileSize !== "number") return null;
  if (
    m.minVersionCode !== undefined &&
    (typeof m.minVersionCode !== "number" || !Number.isFinite(m.minVersionCode))
  )
    return null;
  if (
    m.rollout !== undefined &&
    (typeof m.rollout !== "number" || m.rollout < 0 || m.rollout > 100)
  )
    return null;
  if (m.certSha256 !== undefined && typeof m.certSha256 !== "string") return null;
  if (m.previousVersion !== undefined && typeof m.previousVersion !== "string")
    return null;
  if (
    m.previousVersionCode !== undefined &&
    typeof m.previousVersionCode !== "number"
  )
    return null;
  if (m.previousApkUrl !== undefined && typeof m.previousApkUrl !== "string")
    return null;
  if (
    m.previousApkUrl &&
    !isAllowedApkUrl(m.previousApkUrl as string)
  )
    return null;
  if (m.signature !== undefined && typeof m.signature !== "string") return null;

  return {
    version: m.version,
    versionCode: m.versionCode,
    apkUrl: m.apkUrl,
    notes: (m.notes as string) ?? "",
    mandatory: Boolean(m.mandatory),
    ...(typeof m.sha256 === "string" && m.sha256 ? { sha256: m.sha256 } : {}),
    ...(typeof m.md5 === "string" && m.md5 ? { md5: m.md5 } : {}),
    ...(typeof m.fileSize === "number" && m.fileSize > 0
      ? { fileSize: m.fileSize }
      : {}),
    ...(typeof m.minVersionCode === "number" && m.minVersionCode > 0
      ? { minVersionCode: m.minVersionCode }
      : {}),
    ...(typeof m.rollout === "number" ? { rollout: m.rollout } : {}),
    ...(typeof m.certSha256 === "string" && m.certSha256
      ? { certSha256: m.certSha256 }
      : {}),
    ...(typeof m.previousVersion === "string" && m.previousVersion
      ? { previousVersion: m.previousVersion }
      : {}),
    ...(typeof m.previousVersionCode === "number" && m.previousVersionCode > 0
      ? { previousVersionCode: m.previousVersionCode }
      : {}),
    ...(typeof m.previousApkUrl === "string" && m.previousApkUrl
      ? { previousApkUrl: m.previousApkUrl }
      : {}),
    ...(typeof m.signature === "string" && m.signature
      ? { signature: m.signature }
      : {}),
  };
}

/** Stable signing input. Excludes `signature` itself. */
export function canonicalManifestPayload(m: MobileReleaseManifest): string {
  return [
    m.version,
    String(m.versionCode),
    m.apkUrl,
    m.fileSize ? String(m.fileSize) : "",
    (m.md5 ?? "").toLowerCase(),
    (m.sha256 ?? "").toLowerCase(),
    m.mandatory ? "1" : "0",
    m.minVersionCode ? String(m.minVersionCode) : "",
    m.rollout !== undefined ? String(m.rollout) : "",
    (m.certSha256 ?? "").toLowerCase().replace(/[^0-9a-f]/g, ""),
  ].join("\n");
}

// --- Ed25519 signing (tweetnacl, works in Node + React Native) ---

function b64ToBytes(b64: string): Uint8Array {
  if (typeof Buffer !== "undefined") return new Uint8Array(Buffer.from(b64, "base64"));
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToB64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") return Buffer.from(bytes).toString("base64");
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export async function signManifestPayload(
  payload: string,
  secretKeyB64: string,
): Promise<string> {
  const mod = (await import("tweetnacl")) as unknown as {
    default?: typeof import("tweetnacl");
    sign: typeof import("tweetnacl").sign;
  };
  const nacl = (mod.default ?? mod) as typeof import("tweetnacl");
  const secretKey = b64ToBytes(secretKeyB64.trim());
  const msg = new TextEncoder().encode(payload);
  const sig = nacl.sign.detached(msg, secretKey);
  return bytesToB64(sig);
}

export async function verifyManifestSignature(
  manifest: MobileReleaseManifest,
  publicKeyB64: string,
): Promise<boolean> {
  if (!manifest.signature) return false;
  try {
    const mod = (await import("tweetnacl")) as unknown as {
      default?: typeof import("tweetnacl");
      sign: typeof import("tweetnacl").sign;
    };
    const nacl = (mod.default ?? mod) as typeof import("tweetnacl");
    const publicKey = b64ToBytes(publicKeyB64.trim());
    const msg = new TextEncoder().encode(canonicalManifestPayload(manifest));
    const sig = b64ToBytes(manifest.signature.trim());
    return nacl.sign.detached.verify(msg, sig, publicKey);
  } catch {
    return false;
  }
}

export function getSigningPublicKey(): string | null {
  const v =
    process.env.RELEASE_SIGNING_PUBLIC_KEY?.trim() ||
    process.env.EXPO_PUBLIC_RELEASE_PUBLIC_KEY?.trim() ||
    "";
  return v ? v : null;
}

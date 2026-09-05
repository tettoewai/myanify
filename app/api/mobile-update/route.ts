import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/db";
import {
  canonicalManifestPayload,
  signManifestPayload,
  validateManifest,
  type MobileReleaseManifest,
} from "@/lib/mobile-release";

/**
 * GET /api/mobile-update
 *
 * Public manifest for the side-loaded Android self-update flow.
 * Source of truth order:
 *   1. MobileRelease table (highest active versionCode) — updatable at
 *      runtime via POST with RELEASE_ADMIN_TOKEN, no redeploy needed.
 *   2. mobile-release.json file fallback (seed / disaster recovery).
 */

async function readFileFallback(): Promise<MobileReleaseManifest | null> {
  try {
    const file = await readFile(join(process.cwd(), "mobile-release.json"), "utf-8");
    return validateManifest(JSON.parse(file));
  } catch {
    return null;
  }
}

async function readDbManifest(): Promise<MobileReleaseManifest | null> {
  try {
    const row = await prisma.mobileRelease.findFirst({
      where: { isActive: true },
      orderBy: { versionCode: "desc" },
    });
    if (!row) return null;
    return validateManifest({
      version: row.version,
      versionCode: row.versionCode,
      apkUrl: row.apkUrl,
      notes: row.notes,
      mandatory: row.mandatory,
      sha256: row.sha256 ?? undefined,
      md5: row.md5 ?? undefined,
      fileSize: row.fileSize ?? undefined,
      minVersionCode: row.minVersionCode ?? undefined,
      rollout: row.rollout ?? undefined,
      certSha256: row.certSha256 ?? undefined,
      previousVersion: row.previousVersion ?? undefined,
      previousVersionCode: row.previousVersionCode ?? undefined,
      previousApkUrl: row.previousApkUrl ?? undefined,
      signature: row.signature ?? undefined,
    });
  } catch (e) {
    // DB (Neon cold start) must not break update checks — fall back to file.
    console.warn("[mobile-update] DB lookup failed, using file fallback:", e);
    return null;
  }
}

export async function GET() {
  const manifest = (await readDbManifest()) ?? (await readFileFallback());
  if (!manifest) {
    console.error("[mobile-update] No manifest available (DB empty + file missing/invalid)");
    return NextResponse.json({ error: "Update manifest unavailable" }, { status: 500 });
  }
  return NextResponse.json(manifest, {
    headers: { "Cache-Control": "public, max-age=30" },
  });
}

/**
 * POST /api/mobile-update
 *
 * Runtime manifest update — lets `pnpm upload:apk --push` publish a release
 * without redeploying the web app.
 * Auth: `Authorization: Bearer <RELEASE_ADMIN_TOKEN>`.
 * Body: full manifest fields. If RELEASE_SIGNING_PRIVATE_KEY is set and the
 * body has no `signature`, the server signs it.
 */
export async function POST(req: Request) {
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!process.env.RELEASE_ADMIN_TOKEN || token !== process.env.RELEASE_ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const m = body as Record<string, unknown>;
  // Auto-sign when the uploader didn't (server holds the private key).
  if (!m.signature && process.env.RELEASE_SIGNING_PRIVATE_KEY) {
    const unsigned = validateManifest({ ...(m as object), signature: undefined });
    // validateManifest strips signature; sign only if the rest is valid
    if (unsigned) {
      try {
        const signature = await signManifestPayload(
          canonicalManifestPayload(unsigned),
          process.env.RELEASE_SIGNING_PRIVATE_KEY,
        );
        (m as Record<string, unknown>).signature = signature;
      } catch (e) {
        console.error("[mobile-update] auto-sign failed:", e);
      }
    }
  }

  const manifest = validateManifest(m);
  if (!manifest) {
    return NextResponse.json(
      { error: "Invalid manifest (check version/versionCode/apkUrl allowlist)" },
      { status: 400 },
    );
  }

  try {
    const row = await prisma.mobileRelease.upsert({
      where: { versionCode: manifest.versionCode },
      update: {
        version: manifest.version,
        apkUrl: manifest.apkUrl,
        notes: manifest.notes ?? "",
        mandatory: manifest.mandatory,
        sha256: manifest.sha256 ?? null,
        md5: manifest.md5 ?? null,
        fileSize: manifest.fileSize ?? null,
        minVersionCode: manifest.minVersionCode ?? null,
        rollout: manifest.rollout ?? null,
        certSha256: manifest.certSha256 ?? null,
        previousVersion: manifest.previousVersion ?? null,
        previousVersionCode: manifest.previousVersionCode ?? null,
        previousApkUrl: manifest.previousApkUrl ?? null,
        signature: manifest.signature ?? null,
        isActive: true,
      },
      create: {
        version: manifest.version,
        versionCode: manifest.versionCode,
        apkUrl: manifest.apkUrl,
        notes: manifest.notes ?? "",
        mandatory: manifest.mandatory,
        sha256: manifest.sha256 ?? null,
        md5: manifest.md5 ?? null,
        fileSize: manifest.fileSize ?? null,
        minVersionCode: manifest.minVersionCode ?? null,
        rollout: manifest.rollout ?? null,
        certSha256: manifest.certSha256 ?? null,
        previousVersion: manifest.previousVersion ?? null,
        previousVersionCode: manifest.previousVersionCode ?? null,
        previousApkUrl: manifest.previousApkUrl ?? null,
        signature: manifest.signature ?? null,
        isActive: true,
      },
    });
    return NextResponse.json({ ok: true, versionCode: row.versionCode });
  } catch (e) {
    console.error("[mobile-update] POST failed:", e);
    return NextResponse.json({ error: "Failed to save manifest" }, { status: 500 });
  }
}

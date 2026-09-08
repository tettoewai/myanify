import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { generateLicenseKey, validateLicenseKey } from "@/lib/encryption";
import { DOWNLOAD_LIMITS } from "@/lib/vip-subscription";

/**
 * GET /api/vip/devices
 * Get user's registered devices
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const devices = await prisma.deviceLicense.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ devices });
  } catch (error) {
    console.error("Error fetching devices:", error);
    return NextResponse.json(
      { error: "Failed to fetch devices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vip/devices
 * Register a new device and get license key
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, deviceName, deviceType } = body;

    if (!deviceId || !deviceType) {
      return NextResponse.json(
        { error: "Device ID and device type are required" },
        { status: 400 }
      );
    }

    if (deviceType !== "MOBILE" && deviceType !== "WEB") {
      return NextResponse.json(
        { error: "Device type must be MOBILE or WEB" },
        { status: 400 }
      );
    }

    // Check VIP status — User.isPremium is the single source of truth.
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isPremium: true },
      }),
    );
    if (!user?.isPremium) {
      return NextResponse.json(
        { error: "VIP subscription required for device registration" },
        { status: 403 }
      );
    }

    // Check device limit
    const deviceCount = await withRetry(() =>
      prisma.deviceLicense.count({
        where: {
          userId: session.user.id,
          isValid: true,
        },
      }),
    );

    if (deviceCount >= DOWNLOAD_LIMITS.MAX_DEVICES) {
      return NextResponse.json(
        { error: `Device limit reached (max ${DOWNLOAD_LIMITS.MAX_DEVICES} devices)` },
        { status: 403 }
      );
    }

    // Check if device already exists
    const existing = await withRetry(() =>
      prisma.deviceLicense.findUnique({
        where: {
          userId_deviceId: {
            userId: session.user.id,
            deviceId,
          },
        },
      }),
    );

    let licenseKey: string;
    let existingKeyValid = false;
    if (existing) {
      existingKeyValid = validateLicenseKey(
        existing.licenseKey,
        session.user.id,
        deviceId,
      );
    }
    try {
      // Reuse the stored key when it still verifies; otherwise mint a fresh
      // one. generateLicenseKey throws when no signing secret is configured —
      // surface that as a distinct code so mobile diagnostics can point at
      // server env instead of a generic "Failed to register device".
      licenseKey =
        existing && existingKeyValid
          ? existing.licenseKey
          : generateLicenseKey(session.user.id, deviceId);
    } catch (e) {
      console.error("License signing misconfigured:", e);
      return NextResponse.json(
        {
          error:
            "Server license signing is misconfigured (ENCRYPTION_MASTER_KEY/AUTH_SECRET missing)",
          code: "LICENSE_SIGNING_MISCONFIGURED",
        },
        { status: 500 }
      );
    }

    if (existing) {
      if (existingKeyValid) {
        // License is valid - return existing (also re-activates revoked rows)
        const updated = await withRetry(() =>
          prisma.deviceLicense.update({
            where: { id: existing.id },
            data: {
              lastValidatedAt: new Date(),
              isValid: true,
            },
          }),
        );
        return NextResponse.json({
          message: "Device already registered",
          device: updated,
          licenseKey: updated.licenseKey,
        });
      } else {
        // Stored license no longer verifies (secret rotated) - mint new one
        const updated = await withRetry(() =>
          prisma.deviceLicense.update({
            where: { id: existing.id },
            data: {
              licenseKey,
              lastValidatedAt: new Date(),
              isValid: true,
              deviceName: deviceName || existing.deviceName,
            },
          }),
        );
        return NextResponse.json({
          message: "License regenerated",
          device: updated,
          licenseKey,
        });
      }
    } else {
      // New device - generate license
      try {
        const device = await withRetry(() =>
          prisma.deviceLicense.create({
            data: {
              userId: session.user.id,
              deviceId,
              deviceName: deviceName || `${deviceType} Device`,
              deviceType,
              licenseKey,
              isValid: true,
            },
          }),
        );

        return NextResponse.json({
          message: "Device registered successfully",
          device,
          licenseKey,
        });
      } catch (e: any) {
        // Concurrent first-run registers (parallel downloads) can both pass
        // the findUnique check, then one hits the @@unique(userId, deviceId)
        // constraint. Recover by loading the winner's row instead of 500.
        if (e?.code === "P2002") {
          const winner = await prisma.deviceLicense.findUnique({
            where: {
              userId_deviceId: {
                userId: session.user.id,
                deviceId,
              },
            },
          });
          if (winner) {
            const updated = await prisma.deviceLicense.update({
              where: { id: winner.id },
              data: { lastValidatedAt: new Date(), isValid: true },
            });
            return NextResponse.json({
              message: "Device already registered",
              device: updated,
              licenseKey: updated.licenseKey,
            });
          }
        }
        throw e;
      }
    }
  } catch (error) {
    console.error("Error registering device:", error);
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    );
  }
}

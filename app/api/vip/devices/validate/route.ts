import { NextResponse } from "next/server";
import { prisma, withRetry } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { validateLicenseKey } from "@/lib/encryption";
import { getVIPSettings, resolveEffectiveIsPremium } from "@/lib/vip-settings";

/**
 * POST /api/vip/devices/validate
 * Validate device license for offline playback
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { deviceId, licenseKey } = body;

    if (!deviceId || !licenseKey) {
      return NextResponse.json(
        { error: "Device ID and license key are required" },
        { status: 400 }
      );
    }

    // Check VIP status — User.isPremium + global vip_enabled flag.
    // When VIP is disabled, everyone counts as VIP.
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isPremium: true },
      }),
    );
    const vipSettings = await getVIPSettings();
    if (!resolveEffectiveIsPremium(user?.isPremium ?? false, vipSettings.enabled)) {
      return NextResponse.json(
        { valid: false, error: "VIP subscription expired or inactive" },
        { status: 403 }
      );
    }

    // Find device license
    const device = await withRetry(() =>
      prisma.deviceLicense.findUnique({
        where: {
          userId_deviceId: {
            userId: session.user.id,
            deviceId,
          },
        },
      }),
    );

    if (!device) {
      return NextResponse.json(
        { valid: false, error: "Device not registered", code: "DEVICE_NOT_REGISTERED" },
        { status: 404 }
      );
    }

    // Revoked rows are distinct from a bad key: the client can self-heal by
    // re-registering (POST /vip/devices reactivates the row), so tell it that.
    if (!device.isValid) {
      return NextResponse.json(
        { valid: false, error: "Device revoked, please re-register", code: "DEVICE_REVOKED" },
        { status: 403 }
      );
    }

    // Validate license key
    const isValidKey = validateLicenseKey(licenseKey, session.user.id, deviceId);

    if (!isValidKey) {
      return NextResponse.json(
        { valid: false, error: "Invalid license key", code: "INVALID_LICENSE_KEY" },
        { status: 403 }
      );
    }

    // Check if license needs periodic validation (every 30 days)
    const lastValidation = device.lastValidatedAt;
    const daysSinceValidation = (Date.now() - lastValidation.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceValidation > 30) {
      // Update last validation
      await withRetry(() =>
        prisma.deviceLicense.update({
          where: { id: device.id },
          data: { lastValidatedAt: new Date() },
        }),
      );
    }

    return NextResponse.json({
      valid: true,
      message: "License validated successfully",
      device: {
        ...device,
        lastValidatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error("Error validating license:", error);
    return NextResponse.json(
      { valid: false, error: "Failed to validate license" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { validateLicenseKey } from "@/lib/encryption";

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

    // Check VIP status — User.isPremium is the single source of truth.
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isPremium: true },
    });
    if (!user?.isPremium) {
      return NextResponse.json(
        { valid: false, error: "VIP subscription expired or inactive" },
        { status: 403 }
      );
    }

    // Find device license
    const device = await prisma.deviceLicense.findUnique({
      where: {
        userId_deviceId: {
          userId: session.user.id,
          deviceId,
        },
      },
    });

    if (!device) {
      return NextResponse.json(
        { valid: false, error: "Device not registered" },
        { status: 404 }
      );
    }

    // Validate license key
    const isValidKey = validateLicenseKey(licenseKey, session.user.id, deviceId);
    
    if (!isValidKey || !device.isValid) {
      return NextResponse.json(
        { valid: false, error: "Invalid license key" },
        { status: 403 }
      );
    }

    // Check if license needs periodic validation (every 30 days)
    const lastValidation = device.lastValidatedAt;
    const daysSinceValidation = (Date.now() - lastValidation.getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceValidation > 30) {
      // Update last validation
      await prisma.deviceLicense.update({
        where: { id: device.id },
        data: { lastValidatedAt: new Date() },
      });
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

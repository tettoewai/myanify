import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";
import { generateLicenseKey, validateLicenseKey } from "@/lib/encryption";
import { isUserVIP, DOWNLOAD_LIMITS } from "@/lib/vip-subscription";

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

    // Check VIP status
    const vipCheck = await isUserVIP(session.user.id);
    if (!vipCheck) {
      return NextResponse.json(
        { error: "VIP subscription required for device registration" },
        { status: 403 }
      );
    }

    // Check device limit
    const deviceCount = await prisma.deviceLicense.count({
      where: {
        userId: session.user.id,
        isValid: true,
      },
    });

    if (deviceCount >= DOWNLOAD_LIMITS.MAX_DEVICES) {
      return NextResponse.json(
        { error: `Device limit reached (max ${DOWNLOAD_LIMITS.MAX_DEVICES} devices)` },
        { status: 403 }
      );
    }

    // Check if device already exists
    const existing = await prisma.deviceLicense.findUnique({
      where: {
        userId_deviceId: {
          userId: session.user.id,
          deviceId,
        },
      },
    });

    let licenseKey: string;

    if (existing) {
      // Device exists - validate existing license
      if (validateLicenseKey(existing.licenseKey, session.user.id, deviceId)) {
        // License is valid - return existing
        const updated = await prisma.deviceLicense.update({
          where: { id: existing.id },
          data: {
            lastValidatedAt: new Date(),
            isValid: true,
          },
        });
        return NextResponse.json({
          message: "Device already registered",
          device: updated,
          licenseKey: updated.licenseKey,
        });
      } else {
        // License invalid - generate new one
        licenseKey = generateLicenseKey(session.user.id, deviceId);
        const updated = await prisma.deviceLicense.update({
          where: { id: existing.id },
          data: {
            licenseKey,
            lastValidatedAt: new Date(),
            isValid: true,
            deviceName: deviceName || existing.deviceName,
          },
        });
        return NextResponse.json({
          message: "License regenerated",
          device: updated,
          licenseKey,
        });
      }
    } else {
      // New device - generate license
      licenseKey = generateLicenseKey(session.user.id, deviceId);
      const device = await prisma.deviceLicense.create({
        data: {
          userId: session.user.id,
          deviceId,
          deviceName: deviceName || `${deviceType} Device`,
          deviceType,
          licenseKey,
          isValid: true,
        },
      });

      return NextResponse.json({
        message: "Device registered successfully",
        device,
        licenseKey,
      });
    }
  } catch (error) {
    console.error("Error registering device:", error);
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    );
  }
}

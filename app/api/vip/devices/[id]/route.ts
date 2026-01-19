import { NextResponse } from "next/server";
import { prisma } from "@/db";
import { getSession } from "@/lib/auth-utils";

/**
 * DELETE /api/vip/devices/[id]
 * Deregister/unregister a device
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const device = await prisma.deviceLicense.findUnique({
      where: { id },
    });

    if (!device) {
      return NextResponse.json(
        { error: "Device not found" },
        { status: 404 }
      );
    }

    if (device.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await prisma.deviceLicense.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Device deregistered successfully" });
  } catch (error) {
    console.error("Error deregistering device:", error);
    return NextResponse.json(
      { error: "Failed to deregister device" },
      { status: 500 }
    );
  }
}

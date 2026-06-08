import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { prisma } from "@/db";
import { enforceRateLimit, uploadLimiter } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const limited = await enforceRateLimit(
      request,
      uploadLimiter,
      session.user.id,
    );
    if (limited) return limited;

    const body = await request.json();
    const { url, fileName, fileSize, mimeType } = body;

    if (!url || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields: url and fileName" },
        { status: 400 }
      );
    }

    if (!url.includes("cloudinary.com")) {
      return NextResponse.json({ error: "Invalid upload URL" }, { status: 400 });
    }

    const upload = await prisma.upload.create({
      data: {
        fileName,
        fileType: "audio",
        fileUrl: url,
        fileSize: typeof fileSize === "number" ? fileSize : 0,
        mimeType: mimeType || "audio/mpeg",
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      url,
      uploadId: upload.id,
      fileName,
      fileSize: upload.fileSize,
    });
  } catch (error) {
    console.error("Error registering upload:", error);
    return NextResponse.json(
      { error: "Failed to register upload" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import { generateSignedAudioUploadParams } from "@/lib/cloudinary";
import { formatMaxAudioSize } from "@/lib/audio-upload-config";
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

    const params = generateSignedAudioUploadParams();

    return NextResponse.json({
      ...params,
      maxSize: formatMaxAudioSize(),
    });
  } catch (error) {
    console.error("Error generating upload signature:", error);
    return NextResponse.json(
      { error: "Failed to prepare audio upload" },
      { status: 500 }
    );
  }
}

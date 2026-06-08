import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-utils";
import {
  uploadImageToCloudinary,
  uploadAudioToCloudinary,
  uploadLyricsToCloudinary,
} from "@/lib/cloudinary";
import {
  formatMaxAudioSize,
  isAllowedAudioExtension,
  MAX_AUDIO_INPUT_BYTES,
} from "@/lib/audio-upload-config";
import { prisma } from "@/db";
import { enforceRateLimit, uploadLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large file uploads

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = await enforceRateLimit(
      request,
      uploadLimiter,
      session.user.id,
    );
    if (limited) return limited;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("type") as string; // "audio" or "image"

    // Only Admin can upload audio or lyrics
    if (session.user.role !== "ADMIN" && fileType !== "image") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!fileType || !["audio", "image", "lyrics"].includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type. Must be 'audio', 'image', or 'lyrics'" },
        { status: 400 },
      );
    }

    // Validate file size (50MB for audio, 10MB for images, 1MB for lyrics)
    const maxSize =
      fileType === "audio"
        ? MAX_AUDIO_INPUT_BYTES
        : fileType === "image"
          ? 10 * 1024 * 1024
          : 1 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${
            fileType === "audio"
              ? formatMaxAudioSize()
              : fileType === "image"
                ? "10MB"
                : "1MB"
          }`,
        },
        { status: 400 },
      );
    }

    // Validate file extension
    const fileName = file.name;
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (fileType === "audio") {
      if (!isAllowedAudioExtension(extension)) {
        return NextResponse.json(
          {
            error:
              "Invalid audio format. Allowed: mp3, wav, m4a, flac, ogg, aac, wma",
          },
          { status: 400 },
        );
      }
    } else if (fileType === "image") {
      const allowedImageExtensions = ["jpg", "jpeg", "png", "webp"];
      if (!extension || !allowedImageExtensions.includes(extension)) {
        return NextResponse.json(
          {
            error: `Invalid image format. Allowed: ${allowedImageExtensions.join(
              ", ",
            )}`,
          },
          { status: 400 },
        );
      }
    } else if (fileType === "lyrics") {
      const allowedLyricExtensions = ["lrc", "txt"];
      if (!extension || !allowedLyricExtensions.includes(extension)) {
        return NextResponse.json(
          {
            error: `Invalid lyric format. Allowed: ${allowedLyricExtensions.join(
              ", ",
            )}`,
          },
          { status: 400 },
        );
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const uniqueFileName = `${timestamp}-${randomString}.${fileType === "audio" ? "mp3" : extension}`;

    // Upload to Cloudinary
    let fileUrl: string;
    let storedFileSize = file.size;
    if (fileType === "audio") {
      const audioResult = await uploadAudioToCloudinary(buffer, uniqueFileName);
      fileUrl = audioResult.url;
      storedFileSize = audioResult.bytes;
    } else if (fileType === "image") {
      fileUrl = await uploadImageToCloudinary(buffer, uniqueFileName);
    } else {
      fileUrl = await uploadLyricsToCloudinary(buffer, uniqueFileName);
    }

    // Create upload record in database
    const upload = await prisma.upload.create({
      data: {
        fileName: file.name,
        fileType,
        fileUrl,
        fileSize: storedFileSize,
        mimeType: fileType === "audio" ? "audio/mpeg" : file.type,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      url: fileUrl,
      uploadId: upload.id,
      fileName: file.name,
      fileSize: storedFileSize,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 },
    );
  }
}

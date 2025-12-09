import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  uploadImageToCloudinary,
  uploadAudioToCloudinary,
  uploadLyricsToCloudinary,
} from "@/lib/cloudinary";
import { prisma } from "@/db";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for large file uploads

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const fileType = formData.get("type") as string; // "audio" or "image"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!fileType || !["audio", "image", "lyrics"].includes(fileType)) {
      return NextResponse.json(
        { error: "Invalid file type. Must be 'audio', 'image', or 'lyrics'" },
        { status: 400 }
      );
    }

    // Validate file size (100MB for audio, 10MB for images, 1MB for lyrics)
    const maxSize =
      fileType === "audio"
        ? 100 * 1024 * 1024
        : fileType === "image"
        ? 10 * 1024 * 1024
        : 1 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size: ${
            fileType === "audio"
              ? "100MB"
              : fileType === "image"
              ? "10MB"
              : "1MB"
          }`,
        },
        { status: 400 }
      );
    }

    // Validate file extension
    const fileName = file.name;
    const extension = fileName.split(".").pop()?.toLowerCase();

    if (fileType === "audio") {
      const allowedAudioExtensions = ["mp3", "wav", "m4a", "flac", "ogg"];
      if (!extension || !allowedAudioExtensions.includes(extension)) {
        return NextResponse.json(
          {
            error: `Invalid audio format. Allowed: ${allowedAudioExtensions.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    } else if (fileType === "image") {
      const allowedImageExtensions = ["jpg", "jpeg", "png", "webp"];
      if (!extension || !allowedImageExtensions.includes(extension)) {
        return NextResponse.json(
          {
            error: `Invalid image format. Allowed: ${allowedImageExtensions.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    } else if (fileType === "lyrics") {
      const allowedLyricExtensions = ["lrc", "txt"];
      if (!extension || !allowedLyricExtensions.includes(extension)) {
        return NextResponse.json(
          {
            error: `Invalid lyric format. Allowed: ${allowedLyricExtensions.join(
              ", "
            )}`,
          },
          { status: 400 }
        );
      }
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const uniqueFileName = `${timestamp}-${randomString}.${extension}`;

    // Upload to Cloudinary
    let fileUrl: string;
    if (fileType === "audio") {
      fileUrl = await uploadAudioToCloudinary(buffer, uniqueFileName);
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
        fileSize: file.size,
        mimeType: file.type,
        uploadedById: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      url: fileUrl,
      uploadId: upload.id,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

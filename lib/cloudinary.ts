import { v2 as cloudinary } from "cloudinary";
import { AUDIO_BITRATE } from "@/lib/audio-upload-config";

function ensureCloudinaryConfig() {
  if (!cloudinary.config().cloud_name) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
}

const AUDIO_UPLOAD_OPTIONS = {
  folder: "myanify/audio",
  resource_type: "video" as const,
  format: "mp3",
  audio_codec: "mp3",
  bit_rate: AUDIO_BITRATE,
  use_filename: true,
  unique_filename: true,
};

function requireCloudinaryConfig() {
  ensureCloudinaryConfig();
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    throw new Error(
      "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables are required"
    );
  }

  return {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  };
}

/**
 * Upload a file to Cloudinary
 * @param fileBuffer - The file buffer to upload
 * @param fileName - The name of the file
 * @param folderPath - Optional folder path (default: "myanify")
 * @param resourceType - The resource type: "image", "video", "raw", or "auto"
 * @returns The public URL of the uploaded file
 */
export async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  folderPath: string = "myanify",
  resourceType: "image" | "video" | "raw" | "auto" = "auto"
): Promise<string> {
  try {
    requireCloudinaryConfig();

    // For large files, write to temp file and use upload_large which supports chunking
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const os = await import("node:os");

    const tempDir = os.tmpdir();
    const tempPath = path.join(tempDir, `myanify-upload-${Date.now()}-${fileName}`);
    await fs.writeFile(tempPath, fileBuffer);

    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_large(
        tempPath,
        {
          folder: folderPath,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
          chunk_size: 6000000, // 6MB chunks
        },
        (error: any, result: any) => {
          fs.unlink(tempPath).catch(() => {}); // cleanup
          if (error) {
            console.error("Error uploading to Cloudinary:", error);
            reject(
              new Error(`Failed to upload file to Cloudinary: ${error.message}`)
            );
          } else if (result) {
            resolve(result.secure_url);
          } else {
            reject(new Error("Upload completed but no result returned"));
          }
        }
      );
    });
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    throw error;
  }
}

/**
 * Upload an image file to Cloudinary
 * @param fileBuffer - The image file buffer
 * @param fileName - The name of the file
 * @returns The public URL of the uploaded image
 */
export async function uploadImageToCloudinary(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  return uploadToCloudinary(fileBuffer, fileName, "myanify/images", "image");
}

/**
 * Upload an audio file to Cloudinary
 * @param fileBuffer - The audio file buffer
 * @param fileName - The name of the file
 * @returns The public URL of the uploaded audio
 */
export async function uploadAudioToCloudinary(
  fileBuffer: Buffer,
  _fileName: string
): Promise<{ url: string; bytes: number }> {
  try {
    requireCloudinaryConfig();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        AUDIO_UPLOAD_OPTIONS,
        (error: any, result: any) => {
          if (error) {
            console.error("Error uploading audio to Cloudinary:", error);
            reject(
              new Error(`Failed to upload audio to Cloudinary: ${error.message}`)
            );
          } else if (result) {
            resolve({
              url: result.secure_url,
              bytes: result.bytes ?? fileBuffer.length,
            });
          } else {
            reject(new Error("Upload completed but no result returned"));
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error("Error uploading audio to Cloudinary:", error);
    throw error;
  }
}

export type SignedAudioUploadParams = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  signature: string;
  folder: string;
  format: string;
  uploadUrl: string;
};

export function generateSignedAudioUploadParams(): SignedAudioUploadParams {
  const { cloudName, apiKey, apiSecret } = requireCloudinaryConfig();
  const timestamp = Math.round(Date.now() / 1000);

  // Only params included in the client upload must be signed. Cloudinary ignores
  // audio_codec/bit_rate for signed browser uploads; format=mp3 transcodes on ingest.
  const paramsToSign = {
    timestamp,
    folder: AUDIO_UPLOAD_OPTIONS.folder,
    format: AUDIO_UPLOAD_OPTIONS.format,
  };

  const signature = cloudinary.utils.api_sign_request(
    paramsToSign,
    apiSecret
  );

  return {
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder: AUDIO_UPLOAD_OPTIONS.folder,
    format: AUDIO_UPLOAD_OPTIONS.format,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`,
  };
}

/**
 * Upload a lyrics file to Cloudinary
 * @param fileBuffer - The lyrics file buffer
 * @param fileName - The name of the file
 * @returns The public URL of the uploaded lyrics
 */
export async function uploadLyricsToCloudinary(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  return uploadToCloudinary(fileBuffer, fileName, "myanify/lyrics", "raw");
}

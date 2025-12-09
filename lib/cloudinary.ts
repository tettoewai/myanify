import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

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
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      throw new Error(
        "CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET environment variables are required"
      );
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folderPath,
          resource_type: resourceType,
          use_filename: true,
          unique_filename: true,
        },
        (error: any, result: any) => {
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

      uploadStream.end(fileBuffer);
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
  fileName: string
): Promise<string> {
  return uploadToCloudinary(fileBuffer, fileName, "myanify/audio", "raw");
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

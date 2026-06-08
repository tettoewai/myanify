import {
  formatMaxAudioSize,
  isAllowedAudioExtension,
  MAX_AUDIO_INPUT_BYTES,
} from "@/lib/audio-upload-config";
import { checkApiResponse } from "@/lib/api-client";
import type { SignedAudioUploadParams } from "@/lib/cloudinary";

type CloudinaryUploadResponse = {
  secure_url: string;
  bytes: number;
  format: string;
  resource_type: string;
  error?: { message: string };
};

export type AudioUploadResult = {
  url: string;
  fileName: string;
  fileSize: number;
  uploadId: string;
};

export function validateAudioFile(file: File): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!isAllowedAudioExtension(extension)) {
    return "Unsupported audio format. Use MP3, WAV, M4A, FLAC, or OGG.";
  }

  if (file.size > MAX_AUDIO_INPUT_BYTES) {
    return `File too large. Maximum size is ${formatMaxAudioSize()}.`;
  }

  return null;
}

export async function uploadAudioFile(file: File): Promise<AudioUploadResult> {
  const validationError = validateAudioFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const signResponse = await checkApiResponse(
    await fetch("/api/upload/sign", { method: "POST" }),
  );

  const signData: SignedAudioUploadParams = await signResponse.json();

  const cloudinaryForm = new FormData();
  cloudinaryForm.append("file", file);
  cloudinaryForm.append("api_key", signData.apiKey);
  cloudinaryForm.append("timestamp", signData.timestamp.toString());
  cloudinaryForm.append("signature", signData.signature);
  cloudinaryForm.append("folder", signData.folder);
  cloudinaryForm.append("format", signData.format);

  const uploadResponse = await fetch(signData.uploadUrl, {
    method: "POST",
    body: cloudinaryForm,
  });

  const uploadResult: CloudinaryUploadResponse = await uploadResponse.json();

  if (!uploadResponse.ok || uploadResult.error) {
    throw new Error(
      uploadResult.error?.message || "Failed to upload audio to Cloudinary"
    );
  }

  const registerResponse = await fetch("/api/upload/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: uploadResult.secure_url,
      fileName: file.name,
      fileSize: uploadResult.bytes,
      mimeType: "audio/mpeg",
    }),
  });

  await checkApiResponse(registerResponse);

  const registered = await registerResponse.json();

  return {
    url: registered.url,
    fileName: registered.fileName,
    fileSize: registered.fileSize,
    uploadId: registered.uploadId,
  };
}

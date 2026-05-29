/** Max input size before upload (50 MB — normal for WAV/FLAC masters). */
export const MAX_AUDIO_INPUT_BYTES = 50 * 1024 * 1024;

/** Target MP3 bitrate for Cloudinary transcoding. */
export const AUDIO_BITRATE = "128k";

export const ALLOWED_AUDIO_EXTENSIONS = [
  "mp3",
  "wav",
  "m4a",
  "flac",
  "ogg",
  "aac",
  "wma",
] as const;

export function formatMaxAudioSize(): string {
  return "50MB";
}

export function isAllowedAudioExtension(extension: string | undefined): boolean {
  return (
    !!extension &&
    ALLOWED_AUDIO_EXTENSIONS.includes(
      extension as (typeof ALLOWED_AUDIO_EXTENSIONS)[number]
    )
  );
}

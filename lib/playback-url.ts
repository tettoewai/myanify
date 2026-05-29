const MIME_TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  flac: "audio/flac",
  ogg: "audio/ogg",
};

export function getAudioMimeType(url: string): string {
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  return MIME_TYPES[ext || ""] || "audio/mpeg";
}

export function sniffAudioMimeType(buffer: Uint8Array): string | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0x49 &&
    buffer[1] === 0x44 &&
    buffer[2] === 0x33
  ) {
    return "audio/mpeg";
  }

  if (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return "audio/mpeg";
  }

  if (buffer.length >= 8) {
    const brand = String.fromCharCode(buffer[4], buffer[5], buffer[6], buffer[7]);
    if (brand === "ftyp") {
      return "audio/mp4";
    }
  }

  if (
    buffer.length >= 4 &&
    buffer[0] === 0x4f &&
    buffer[1] === 0x67 &&
    buffer[2] === 0x67 &&
    buffer[3] === 0x53
  ) {
    return "audio/ogg";
  }

  if (buffer.length >= 4) {
    const riff = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3]);
    if (riff === "RIFF") {
      return "audio/wav";
    }
  }

  return null;
}

export function hasKnownAudioExtension(url: string): boolean {
  const ext = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  return !!ext && ext in MIME_TYPES;
}

export function isAllowedAudioSourceUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    return (
      parsed.hostname.includes("cloudinary.com") ||
      parsed.hostname.includes("mega.nz") ||
      parsed.hostname.includes("mega.co.nz")
    );
  } catch {
    return false;
  }
}

export function getRequestBaseUrl(request?: Request): string {
  if (!request) {
    return "";
  }

  const url = new URL(request.url);
  const host = request.headers.get("x-forwarded-host") || url.host;
  const proto =
    request.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");

  return `${proto}://${host}`;
}

export function getPlaybackUrl(
  audioUrl: string | null | undefined,
  request?: Request
): string {
  if (!audioUrl) {
    return "";
  }

  const streamPath = `/api/audio/stream?url=${encodeURIComponent(audioUrl)}`;
  const baseUrl = getRequestBaseUrl(request);

  return baseUrl ? `${baseUrl}${streamPath}` : streamPath;
}

export function withPlaybackUrl<T extends { audioUrl?: string | null }>(
  song: T,
  request?: Request
): T & { playbackUrl: string } {
  return {
    ...song,
    playbackUrl: getPlaybackUrl(song.audioUrl, request),
  };
}

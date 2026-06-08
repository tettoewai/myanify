import { NextRequest, NextResponse } from "next/server";
import {
  getAudioMimeType,
  hasKnownAudioExtension,
  isAllowedAudioSourceUrl,
  sniffAudioMimeType,
} from "@/lib/playback-url";
import { enforceRateLimit, streamLimiter } from "@/lib/rate-limit";

function responseIncludesFileStart(
  status: number,
  contentRange: string | null,
): boolean {
  if (status === 200) {
    return true;
  }

  return !!contentRange?.startsWith("bytes 0-");
}

async function resolveResponseMimeType(
  url: string,
  upstreamContentType: string | null,
  body: ReadableStream<Uint8Array> | null,
  status: number,
  contentRange: string | null,
): Promise<{ mimeType: string; body: ReadableStream<Uint8Array> | null }> {
  if (upstreamContentType && !upstreamContentType.includes("octet-stream")) {
    return { mimeType: upstreamContentType, body };
  }

  if (hasKnownAudioExtension(url)) {
    return { mimeType: getAudioMimeType(url), body };
  }

  if (body && responseIncludesFileStart(status, contentRange)) {
    const reader = body.getReader();
    const firstChunk = await reader.read();

    if (firstChunk.value) {
      const sniffed =
        sniffAudioMimeType(firstChunk.value) || getAudioMimeType(url);

      const combinedBody = new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(firstChunk.value!);

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        },
      });

      return { mimeType: sniffed, body: combinedBody };
    }
  }

  return { mimeType: getAudioMimeType(url), body };
}

export async function GET(request: NextRequest) {
  const limited = await enforceRateLimit(
    request,
    streamLimiter,
    "audio-stream",
  );
  if (limited) return limited;

  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url || !isAllowedAudioSourceUrl(url)) {
      return NextResponse.json({ error: "Invalid audio URL" }, { status: 400 });
    }

    const rangeHeader = request.headers.get("range");
    const fetchHeaders: HeadersInit = {
      "User-Agent": "Myanify/1.0",
    };

    if (rangeHeader) {
      fetchHeaders.Range = rangeHeader;
    }

    const response = await fetch(url, {
      headers: fetchHeaders,
      redirect: "follow",
    });

    if (!response.ok && response.status !== 206) {
      return NextResponse.json(
        { error: "Failed to fetch audio" },
        { status: 502 },
      );
    }

    const contentRange = response.headers.get("content-range");
    const { mimeType, body } = await resolveResponseMimeType(
      url,
      response.headers.get("content-type"),
      response.body,
      response.status,
      contentRange,
    );

    const headers = new Headers({
      "Content-Type": mimeType,
      "Accept-Ranges": "bytes",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    });

    const contentLength = response.headers.get("content-length");
    if (contentLength) {
      headers.set("Content-Length", contentLength);
    }

    if (contentRange) {
      headers.set("Content-Range", contentRange);
    }

    return new NextResponse(body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error("Error streaming audio:", error);
    return NextResponse.json(
      { error: "Failed to stream audio" },
      { status: 500 },
    );
  }
}

"use client";

import { toast } from "sonner";
import {
  getAbsoluteShareUrl,
  type ShareableEntity,
} from "@/lib/share-urls";

export interface SharePayload {
  type: ShareableEntity;
  id: string;
  title: string;
  text?: string;
}

function resolveUrl({ type, id }: SharePayload): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : undefined;
  return getAbsoluteShareUrl(type, id, origin);
}

export async function shareContent(payload: SharePayload): Promise<void> {
  const url = resolveUrl(payload);
  const shareData: ShareData = {
    title: payload.title,
    text: payload.text ?? payload.title,
    url,
  };

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard");
  } catch {
    toast.error("Could not copy link");
  }
}

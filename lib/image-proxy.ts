import { getPlaceholderSrc } from "./placeholders";

/**
 * Convert image URL to proxy URL if needed
 * Cloudinary URLs work directly, but we keep this function for backward compatibility
 * and to handle any legacy MEGA URLs that might still exist
 */
export function getImageProxyUrl(imageUrl: string | null | undefined): string {
  if (!imageUrl) {
    return getPlaceholderSrc("dark");
  }

  // If it's already a placeholder or local URL, return as-is
  if (imageUrl.startsWith("/") || imageUrl.startsWith("http://localhost")) {
    return imageUrl;
  }

  // Cloudinary URLs work directly, no proxy needed
  if (imageUrl.includes("cloudinary.com") || imageUrl.includes("res.cloudinary.com")) {
    return imageUrl;
  }

  // Legacy MEGA URLs - use proxy for backward compatibility
  if (imageUrl.includes("mega.nz") || imageUrl.includes("mega.co.nz")) {
    return `/api/images/proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // For other URLs, return as-is
  return imageUrl;
}

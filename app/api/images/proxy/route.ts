import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Cloudinary URLs work directly, redirect to them
    if (url.includes("cloudinary.com") || url.includes("res.cloudinary.com")) {
      return NextResponse.redirect(url);
    }

    // Legacy MEGA URL support for backward compatibility
    if (url.includes("mega.nz") || url.includes("mega.co.nz")) {
      // MEGA share links need special handling
      // Convert MEGA share link to download link format
      // Format: https://mega.nz/file/ID#KEY or https://mega.nz/#!ID!KEY
      let downloadUrl = url;

      // Convert share link format (#!ID!KEY) to file format (/file/ID#KEY)
      if (url.includes("#!")) {
        const match = url.match(/mega\.nz\/#!([^!]+)!([^#]+)/);
        if (match) {
          downloadUrl = `https://mega.nz/file/${match[1]}#${match[2]}`;
        }
      }

      // MEGA download links format: https://mega.nz/file/ID#KEY
      // We need to convert this to the actual download URL
      // MEGA uses a different endpoint for downloads: https://mega.nz/dl/ID#KEY
      if (downloadUrl.includes("/file/")) {
        downloadUrl = downloadUrl.replace("/file/", "/dl/");
      }

      // Try to fetch the image
      // Note: MEGA may require authentication or special headers
      const response = await fetch(downloadUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "image/*",
        },
        redirect: "follow",
      });

      if (!response.ok) {
        // If fetch fails, return a placeholder or error
        console.error(`Failed to fetch MEGA image: ${url}`, response.status);
        return NextResponse.redirect(new URL("/placeholder.svg", request.url));
      }

      const imageBuffer = await response.arrayBuffer();
      const contentType = response.headers.get("content-type") || "image/jpeg";

      // Return the image with proper headers
      return new NextResponse(imageBuffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // For other URLs, try to fetch and proxy
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "image/*",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      console.error(`Failed to fetch image: ${url}`, response.status);
      return NextResponse.redirect(new URL("/placeholder.svg", request.url));
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    return new NextResponse(imageBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error proxying image:", error);
    // Return placeholder on error
    return NextResponse.redirect(new URL("/placeholder.svg", request.url));
  }
}

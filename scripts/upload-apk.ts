import { config as dotenvConfig } from "dotenv";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { uploadToCloudinary } from "../lib/cloudinary";

dotenvConfig();

async function main() {
  const apkPath = process.argv[2];
  if (!apkPath) {
    console.error("Usage: tsx scripts/upload-apk.ts <path-to-apk>");
    process.exit(1);
  }

  const resolved = apkPath.startsWith("/")
    ? apkPath
    : join(process.cwd(), apkPath);

  console.log(`Uploading ${resolved} to Cloudinary...`);
  const buffer = await readFile(resolved);
  const url = await uploadToCloudinary(
    buffer,
    "myanify-app.apk",
    "myanify/releases",
    "raw",
  );

  console.log("\nUpload complete ✅");
  console.log("APK URL:", url);
  console.log(
    "\nUpdate mobile-release.json with this URL, the new version, and versionCode.",
  );
}

main().catch((error) => {
  console.error("APK upload failed:", error);
  process.exit(1);
});

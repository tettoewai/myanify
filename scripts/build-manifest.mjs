import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: join(process.cwd(), ".env.local") });
dotenvConfig({ path: join(process.cwd(), ".env") });

const data = readFileSync("/tmp/myanify_1.0.13.apk");
const sha256 = createHash("sha256").update(data).digest("hex");
const md5 = createHash("md5").update(data).digest("hex");
const prevJson = JSON.parse(readFileSync(join(process.cwd(), "mobile-release.json"), "utf-8"));

const manifest = {
  version: "1.0.13",
  versionCode: 31,
  apkUrl: "https://github.com/tettoewai/myanify-releases/releases/download/v1.0.13/myanify_1_0_13_31.apk",
  notes: "fix: notification player parity - prev/next/like with liked state, tap to full player, crash + OOM + visibility fixes across Android 7-15",
  mandatory: true,
  sha256,
  md5,
  fileSize: data.length,
  minVersionCode: 1,
  rollout: 100,
  certSha256: "fac61745dc0903786fb9d62a962b399f7348f0bb6f899b8332667591033b9c",
  previousVersion: "1.0.12",
  previousVersionCode: 26,
  previousApkUrl: "https://github.com/tettoewai/myanify-releases/releases/download/v1.0.12/myanify_1_0_12_26.apk",
};

const payload = [
  manifest.version,
  String(manifest.versionCode),
  manifest.apkUrl,
  String(manifest.fileSize),
  String(manifest.md5).toLowerCase(),
  String(manifest.sha256).toLowerCase(),
  manifest.mandatory ? "1" : "0",
  String(manifest.minVersionCode),
  String(manifest.rollout),
  String(manifest.certSha256).toLowerCase().replace(/[^0-9a-f]/g, ""),
].join("\n");

const nacl = (await import("tweetnacl")).default;
const sk = Buffer.from(process.env.RELEASE_SIGNING_PRIVATE_KEY.trim(), "base64");
manifest.signature = Buffer.from(
  nacl.sign.detached(new TextEncoder().encode(payload), new Uint8Array(sk)),
).toString("base64");

const releaseJson = { ...prevJson, ...manifest };
writeFileSync(join(process.cwd(), "mobile-release.json"), JSON.stringify(releaseJson, null, 2) + "\n");
console.log(JSON.stringify(manifest, null, 2));
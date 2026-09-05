import { readFileSync } from "node:fs";
import { join } from "node:path";

/** CI validation for mobile-release.json seed file. */
async function main() {
  const { validateManifest } = await import("../lib/mobile-release");
  const raw = JSON.parse(readFileSync(join(process.cwd(), "mobile-release.json"), "utf-8"));
  const m = validateManifest(raw);
  if (!m) {
    console.error("mobile-release.json INVALID (version/versionCode/apkUrl allowlist)");
    process.exit(1);
  }
  console.log(`manifest OK: v${m.version} (${m.versionCode}) ${m.apkUrl}`);
  if (!m.md5 || !m.fileSize) console.warn("warning: missing md5/fileSize — on-device verification weakened");
  if (!m.signature) console.warn("warning: unsigned manifest — configure RELEASE_SIGNING_PRIVATE_KEY");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

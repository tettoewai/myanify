import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Bump mobile version + versionCode in lockstep.
 * Usage: tsx scripts/bump-mobile-version.ts <version> [versionCode]
 * - version: e.g. 1.0.9
 * - versionCode: defaults to current + 1
 * Updates: ../myanify-app/app.json (expo.version + android.versionCode)
 *          ../myanify-app/package.json (version)
 */
function main() {
  const [version, codeArg] = process.argv.slice(2);
  if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
    console.error("Usage: tsx scripts/bump-mobile-version.ts <x.y.z> [versionCode]");
    process.exit(1);
  }
  const appJsonPath = join(process.cwd(), "..", "myanify-app", "app.json");
  const pkgPath = join(process.cwd(), "..", "myanify-app", "package.json");
  const appJson = JSON.parse(readFileSync(appJsonPath, "utf-8"));
  const currentCode = Number(appJson.expo?.android?.versionCode ?? 0);
  const versionCode = codeArg ? Number(codeArg) : currentCode + 1;
  if (!Number.isFinite(versionCode) || versionCode <= currentCode) {
    console.error(`versionCode must be > current (${currentCode}). Got: ${codeArg}`);
    process.exit(1);
  }
  appJson.expo.version = version;
  appJson.expo.android.versionCode = versionCode;
  writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + "\n");

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
  pkg.version = version;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");

  console.log(`Bumped to ${version} (${versionCode}) in app.json + package.json`);
}

main();

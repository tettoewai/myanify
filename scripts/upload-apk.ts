import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

const RELEASE_REPO = "tettoewai/myanify-releases";

function checkGhCLI() {
  try {
    execSync("gh --version", { stdio: "pipe" });
  } catch {
    throw new Error("GitHub CLI (gh) is not installed. Run: brew install gh");
  }
  try {
    execSync("gh auth status", { stdio: "pipe" });
  } catch {
    throw new Error(
      "Not authenticated with GitHub CLI. Run: gh auth login",
    );
  }
}

async function resolveApk(
  input: string,
): Promise<{ path: string; filename: string }> {
  const isUrl = input.startsWith("http://") || input.startsWith("https://");

  if (isUrl) {
    console.log(`Downloading APK from ${input}...`);
    const response = await fetch(input);
    if (!response.ok) {
      throw new Error(`Failed to download APK: HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const filename = basename(new URL(input).pathname) || "myanify-app.apk";
    const tempPath = join(tmpdir(), filename);
    writeFileSync(tempPath, buffer);
    return { path: tempPath, filename };
  }

  const resolved = input.startsWith("/")
    ? input
    : join(process.cwd(), input);
  return { path: resolved, filename: basename(resolved) };
}

async function main() {
  const apkInput = process.argv[2];
  if (!apkInput) {
    console.error(
      "Usage: tsx scripts/upload-apk.ts <path-or-url-to-apk> [version] [versionCode]",
    );
    process.exit(1);
  }

  checkGhCLI();

  const { path: resolved, filename } = await resolveApk(apkInput);

  const appJsonPath = join(process.cwd(), "..", "myanify-app", "app.json");
  let defaultVersion: string | undefined;
  let defaultVersionCode: number | undefined;
  try {
    const appJson = JSON.parse(readFileSync(appJsonPath, "utf-8"));
    defaultVersion = appJson.expo?.version;
    defaultVersionCode = appJson.expo?.android?.versionCode;
  } catch {
    // app.json not found, will require version arg
  }

  const version = process.argv[3] || defaultVersion;
  const versionCode = Number(process.argv[4] || defaultVersionCode);

  if (!version) {
    console.error(
      "Could not determine version. Either pass it as an argument or ensure ../myanify-app/app.json exists.",
    );
    process.exit(1);
  }

  const tag = `v${version}`;

  console.log(`Creating GitHub release: ${tag}`);
  console.log(`  Repo:        ${RELEASE_REPO}`);
  console.log(`  Version:     ${version}`);
  console.log(`  VersionCode: ${versionCode}`);
  console.log(`  APK:         ${resolved}`);

  try {
    const existing = execSync(`gh release view ${tag} --repo ${RELEASE_REPO}`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
    if (existing) {
      console.log(`Release ${tag} already exists. Deleting...`);
      execSync(`gh release delete ${tag} --repo ${RELEASE_REPO} --yes`, {
        stdio: "inherit",
      });
    }
  } catch {
    // Release doesn't exist — proceed
  }

  execSync(
    `gh release create ${tag} "${resolved}" --repo "${RELEASE_REPO}" --title "${tag}" --notes ""`,
    { stdio: "inherit" },
  );

  const apkUrl = `https://github.com/${RELEASE_REPO}/releases/download/${tag}/${filename}`;

  const releaseJsonPath = join(process.cwd(), "mobile-release.json");
  const releaseJson = JSON.parse(readFileSync(releaseJsonPath, "utf-8"));
  releaseJson.version = version;
  releaseJson.versionCode = versionCode;
  releaseJson.apkUrl = apkUrl;
  writeFileSync(
    releaseJsonPath,
    JSON.stringify(releaseJson, null, 2) + "\n",
  );

  console.log("\nRelease created successfully!");
  console.log("APK URL:", apkUrl);
  console.log("Updated mobile-release.json");
}

main().catch((error) => {
  console.error("Release failed:", error);
  process.exit(1);
});

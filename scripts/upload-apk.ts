import { execSync } from "node:child_process";
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

const RELEASE_REPO =
  process.env.RELEASE_REPO?.trim() || "tettoewai/myanify-releases";

function ensureGhAuth() {
  const token =
    process.env.RELEASE_GITHUB_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim();

  if (token) {
    execSync("gh auth login --with-token", {
      input: token,
      stdio: ["pipe", "pipe", "inherit"],
    });
    return;
  }

  try {
    execSync("gh --version", { stdio: "pipe" });
  } catch {
    throw new Error("GitHub CLI (gh) is not installed. Run: brew install gh");
  }

  try {
    execSync("gh auth status", { stdio: "pipe" });
  } catch {
    throw new Error(
      "Not authenticated with GitHub CLI. Run: gh auth login or set RELEASE_GITHUB_TOKEN",
    );
  }
}

function buildReleaseApkName(version: string, versionCode: number): string {
  return `myanify_${version.replace(/\./g, "_")}_${versionCode}.apk`;
}

function parseArgs(argv: string[]) {
  const positional: string[] = [];
  let notes = process.env.RELEASE_NOTES?.trim() || "";
  let mandatory = process.env.RELEASE_MANDATORY === "true";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--notes") {
      notes = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    if (arg === "--mandatory") {
      mandatory = true;
      continue;
    }
    positional.push(arg);
  }

  return { positional, notes, mandatory };
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
  const { positional, notes, mandatory } = parseArgs(process.argv.slice(2));
  const apkInput = positional[0];
  if (!apkInput) {
    console.error(
      "Usage: tsx scripts/upload-apk.ts <path-or-url-to-apk> [version] [versionCode] [--notes text] [--mandatory]",
    );
    process.exit(1);
  }

  ensureGhAuth();

  const { path: resolved } = await resolveApk(apkInput);

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

  const version = positional[1] || defaultVersion;
  const versionCode = Number(positional[2] || defaultVersionCode);

  if (!version) {
    console.error(
      "Could not determine version. Either pass it as an argument or ensure ../myanify-app/app.json exists.",
    );
    process.exit(1);
  }

  if (!Number.isFinite(versionCode) || versionCode <= 0) {
    console.error("A valid versionCode is required.");
    process.exit(1);
  }

  const tag = `v${version}`;
  const filename = buildReleaseApkName(version, versionCode);
  const uploadPath = join(tmpdir(), filename);
  copyFileSync(resolved, uploadPath);

  console.log(`Creating GitHub release: ${tag}`);
  console.log(`  Repo:        ${RELEASE_REPO}`);
  console.log(`  Version:     ${version}`);
  console.log(`  VersionCode: ${versionCode}`);
  console.log(`  APK:         ${uploadPath}`);
  if (notes) {
    console.log(`  Notes:       ${notes}`);
  }
  console.log(`  Mandatory:   ${mandatory}`);

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

  const releaseNotes = notes || `Myanify Android ${version} (versionCode ${versionCode})`;

  execSync(
    `gh release create ${tag} "${uploadPath}" --repo "${RELEASE_REPO}" --title "${tag}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`,
    { stdio: "inherit" },
  );

  const apkUrl = `https://github.com/${RELEASE_REPO}/releases/download/${tag}/${filename}`;

  const releaseJsonPath = join(process.cwd(), "mobile-release.json");
  const releaseJson = JSON.parse(readFileSync(releaseJsonPath, "utf-8"));
  releaseJson.version = version;
  releaseJson.versionCode = versionCode;
  releaseJson.apkUrl = apkUrl;
  releaseJson.notes = notes;
  releaseJson.mandatory = mandatory;
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

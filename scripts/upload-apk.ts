import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";

function getGitHubRepo(): string {
  const remoteUrl = execSync("git remote get-url origin", {
    encoding: "utf-8",
  }).trim();
  const match = remoteUrl.match(/github\.com[:\/](.+?)(\.git)?$/);
  if (!match) {
    throw new Error(`Could not parse GitHub repo from remote: ${remoteUrl}`);
  }
  return match[1];
}

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
    const filename = "myanify-app.apk";
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

  // Read version defaults from app.json
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
  const repo = getGitHubRepo();

  console.log(`Creating GitHub release: ${tag}`);
  console.log(`  Repo:       ${repo}`);
  console.log(`  Version:    ${version}`);
  console.log(`  VersionCode: ${versionCode}`);
  console.log(`  APK:        ${resolved}`);

  // Delete existing release/tag if present
  try {
    const existing = execSync(`gh release view ${tag} --repo ${repo}`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
    if (existing) {
      console.log(`Release ${tag} already exists. Deleting...`);
      execSync(`gh release delete ${tag} --repo ${repo} --yes`, {
        stdio: "inherit",
      });
      execSync(`git tag -d ${tag} 2>/dev/null || true`, { stdio: "pipe" });
      execSync(`git push origin :refs/tags/${tag} 2>/dev/null || true`, {
        stdio: "pipe",
      });
    }
  } catch {
    // Release doesn't exist — proceed
  }

  // Create release and upload APK
  execSync(
    `gh release create ${tag} "${resolved}" --repo "${repo}" --title "${tag}" --notes ""`,
    { stdio: "inherit" },
  );

  const apkUrl = `https://github.com/${repo}/releases/download/${tag}/${filename}`;

  // Update mobile-release.json
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

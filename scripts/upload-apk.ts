import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { tmpdir } from "node:os";
import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: join(process.cwd(), ".env.local") });
dotenvConfig();

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
  let force = false;
  let push = process.env.RELEASE_PUSH !== "false"; // push to production API by default
  let minVersionCode: number | undefined;
  let rollout: number | undefined;
  let certSha256 = process.env.RELEASE_CERT_SHA256?.trim() || "";

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
    if (arg === "--force") {
      force = true;
      continue;
    }
    if (arg === "--no-push") {
      push = false;
      continue;
    }
    if (arg === "--push") {
      push = true;
      continue;
    }
    if (arg === "--min-version-code") {
      minVersionCode = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--rollout") {
      rollout = Number(argv[i + 1]);
      i += 1;
      continue;
    }
    if (arg === "--cert-sha256") {
      certSha256 = argv[i + 1] ?? "";
      i += 1;
      continue;
    }
    positional.push(arg);
  }

  return { positional, notes, mandatory, force, push, minVersionCode, rollout, certSha256 };
}

function computeFileHashAndSize(filePath: string): {
  sha256: string;
  md5: string;
  fileSize: number;
} {
  const data = readFileSync(filePath);
  const sha256 = createHash("sha256").update(data).digest("hex");
  const md5 = createHash("md5").update(data).digest("hex");
  const { size } = statSync(filePath);
  return { sha256, md5, fileSize: size };
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

function canonicalPayload(m: Record<string, unknown>): string {
  return [
    m.version,
    String(m.versionCode),
    m.apkUrl,
    m.fileSize ? String(m.fileSize) : "",
    String(m.md5 ?? "").toLowerCase(),
    String(m.sha256 ?? "").toLowerCase(),
    m.mandatory ? "1" : "0",
    m.minVersionCode ? String(m.minVersionCode) : "",
    m.rollout !== undefined ? String(m.rollout) : "",
    String(m.certSha256 ?? "").toLowerCase().replace(/[^0-9a-f]/g, ""),
  ].join("\n");
}

async function signPayload(payload: string, secretKeyB64: string): Promise<string> {
  const mod = (await import("tweetnacl")) as unknown as {
    default?: typeof import("tweetnacl");
    sign: typeof import("tweetnacl").sign;
  };
  const nacl = (mod.default ?? mod) as typeof import("tweetnacl");
  const secretKey = Buffer.from(secretKeyB64.trim(), "base64");
  const sig = nacl.sign.detached(new TextEncoder().encode(payload), new Uint8Array(secretKey));
  return Buffer.from(sig).toString("base64");
}

function getProductionApiBase(): string {
  return (
    process.env.RELEASE_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://myanify.vercel.app"
  ).replace(/\/$/, "");
}

async function main() {
  const { positional, notes, mandatory, force, push, minVersionCode, rollout, certSha256 } = parseArgs(process.argv.slice(2));
  const apkInput = positional[0];
  if (!apkInput) {
    console.error(
      "Usage: tsx scripts/upload-apk.ts <path-or-url-to-apk> [version] [versionCode] [--notes text] [--mandatory] [--min-version-code N] [--rollout 0-100] [--cert-sha256 HEX] [--force] [--no-push]",
    );
    console.error("  --push/--no-push: POST manifest to production API (default: push, needs RELEASE_ADMIN_TOKEN)");
    console.error("  --force: overwrite existing GitHub release if tag already exists");
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

  if (rollout !== undefined && (!Number.isFinite(rollout) || rollout < 0 || rollout > 100)) {
    console.error("--rollout must be 0-100.");
    process.exit(1);
  }

  // Monotonicity guard against the committed seed file
  const releaseJsonPath = join(process.cwd(), "mobile-release.json");
  const prevJson = JSON.parse(readFileSync(releaseJsonPath, "utf-8"));
  if (
    typeof prevJson.versionCode === "number" &&
    versionCode <= prevJson.versionCode &&
    !force
  ) {
    console.error(
      `\nversionCode ${versionCode} is not newer than mobile-release.json (${prevJson.versionCode}). Bump it or use --force.`,
    );
    process.exit(1);
  }
  const previousVersion = typeof prevJson.version === "string" ? prevJson.version : undefined;
  const previousVersionCode =
    typeof prevJson.versionCode === "number" ? prevJson.versionCode : undefined;
  const previousApkUrl = typeof prevJson.apkUrl === "string" ? prevJson.apkUrl : undefined;

  const tag = `v${version}`;
  const filename = buildReleaseApkName(version, versionCode);
  const uploadPath = join(tmpdir(), filename);
  copyFileSync(resolved, uploadPath);

  const { sha256, md5, fileSize } = computeFileHashAndSize(uploadPath);

  console.log(`Creating GitHub release: ${tag}`);
  console.log(`  Repo:        ${RELEASE_REPO}`);
  console.log(`  Version:     ${version}`);
  console.log(`  VersionCode: ${versionCode}`);
  console.log(`  APK:         ${uploadPath}`);
  console.log(`  SHA256:      ${sha256}`);
  console.log(`  MD5:         ${md5}`);
  console.log(`  FileSize:    ${fileSize} bytes`);
  if (notes) {
    console.log(`  Notes:       ${notes}`);
  }
  console.log(`  Mandatory:   ${mandatory}`);
  if (minVersionCode) console.log(`  MinVC:       ${minVersionCode}`);
  if (rollout !== undefined) console.log(`  Rollout:     ${rollout}%`);
  if (certSha256) console.log(`  CertSHA256:  ${certSha256.slice(0, 16)}…`);

  let existingRelease = false;
  try {
    execSync(`gh release view ${tag} --repo ${RELEASE_REPO}`, {
      stdio: "pipe",
      encoding: "utf-8",
    });
    existingRelease = true;
  } catch {
    // Release doesn't exist — proceed
  }

  if (existingRelease) {
    if (!force) {
      console.error(`\nRelease ${tag} already exists in ${RELEASE_REPO}.`);
      console.error("Use --force to overwrite, or bump the version.");
      console.error(`To view: gh release view ${tag} --repo ${RELEASE_REPO}`);
      process.exit(1);
    }
    console.log(`Release ${tag} already exists. Deleting ( --force )...`);
    execSync(`gh release delete ${tag} --repo ${RELEASE_REPO} --yes`, {
      stdio: "inherit",
    });
  }

  const releaseNotes = notes || `Myanify Android ${version} (versionCode ${versionCode})`;

  execSync(
    `gh release create ${tag} "${uploadPath}" --repo "${RELEASE_REPO}" --title "${tag}" --notes "${releaseNotes.replace(/"/g, '\\"')}"`,
    { stdio: "inherit" },
  );

  const apkUrl = `https://github.com/${RELEASE_REPO}/releases/download/${tag}/${filename}`;

  const manifest: Record<string, unknown> = {
    version,
    versionCode,
    apkUrl,
    notes,
    mandatory,
    sha256,
    md5,
    fileSize,
    ...(minVersionCode ? { minVersionCode } : {}),
    ...(rollout !== undefined ? { rollout } : {}),
    ...(certSha256 ? { certSha256 } : {}),
    ...(previousVersion ? { previousVersion } : {}),
    ...(previousVersionCode ? { previousVersionCode } : {}),
    ...(previousApkUrl ? { previousApkUrl } : {}),
  };

  const signingKey = process.env.RELEASE_SIGNING_PRIVATE_KEY?.trim();
  if (signingKey) {
    manifest.signature = await signPayload(canonicalPayload(manifest), signingKey);
    console.log("Signed manifest with RELEASE_SIGNING_PRIVATE_KEY");
  } else {
    console.log("No RELEASE_SIGNING_PRIVATE_KEY — manifest unsigned (client warns, still installs)");
  }

  const releaseJson = { ...prevJson, ...manifest };
  writeFileSync(releaseJsonPath, JSON.stringify(releaseJson, null, 2) + "\n");

  console.log("\nRelease created successfully!");
  console.log("APK URL:", apkUrl);
  console.log("Updated mobile-release.json (seed/fallback)");

  if (push) {
    const adminToken = process.env.RELEASE_ADMIN_TOKEN?.trim();
    if (!adminToken) {
      console.log("\nSkipping API push: RELEASE_ADMIN_TOKEN not set.");
      console.log("Deploy the web app to publish, or set RELEASE_ADMIN_TOKEN to push without redeploy.");
      return;
    }
    const apiBase = getProductionApiBase();
    console.log(`\nPushing manifest to ${apiBase}/api/mobile-update ...`);
    const res = await fetch(`${apiBase}/api/mobile-update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify(manifest),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`API push failed (HTTP ${res.status}): ${text}`);
      console.error("The GitHub release exists, but production still serves the old manifest until web redeploy.");
      process.exit(1);
    }
    console.log("Production manifest updated — no redeploy needed.");
  } else {
    console.log("\n--no-push: deploy the web app to publish the new manifest.");
  }
}

main().catch((error) => {
  console.error("Release failed:", error);
  process.exit(1);
});

import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const publicDir = path.join(root, "public");
const srcSvg = path.join(publicDir, "icon.svg");

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

if (!(await fileExists(srcSvg))) {
  console.error("public/icon.svg not found — skipping PWA icon generation");
  process.exit(1);
}

const sizes = [192, 512];

for (const size of sizes) {
  const out = path.join(publicDir, `icon-${size}.png`);
  if (await fileExists(out)) {
    console.log(`${out} exists — skipping`);
    continue;
  }
  await sharp(srcSvg, { density: 300 })
    .resize(size, size, { fit: "cover" })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(out);
  console.log(`Generated ${out}`);
}

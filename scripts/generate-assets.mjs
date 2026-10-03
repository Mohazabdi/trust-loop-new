import sharp from "sharp";
import { readFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "assets", "source");
const OUT = join(ROOT, "assets", "images");

async function load(name) {
  return readFile(join(SRC, name));
}

async function render(svg, { width, height, out, flatten }) {
  let pipeline = sharp(svg, { density: 384 }).resize(width, height);
  if (flatten) pipeline = pipeline.flatten({ background: flatten });
  await pipeline.png({ compressionLevel: 9 }).toFile(join(OUT, out));
  console.log(`  \u2713 ${out.padEnd(34)} ${width}\u00D7${height}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });

  const icon = await load("icon.svg");
  const splash = await load("splash.svg");
  const mono = await load("monochrome.svg");
  const fg = await load("adaptive-foreground.svg");
  const bg = await load("adaptive-background.svg");

  console.log("Generating assets...\n");

  await render(icon, { width: 1024, height: 1024, out: "icon.png", flatten: "#0A1130" });
  await render(icon, { width: 1024, height: 1024, out: "trustloop-logo.png", flatten: "#0A1130" });
  await render(splash, { width: 1024, height: 1280, out: "splash-icon.png" });
  await render(fg, { width: 1024, height: 1024, out: "trust-loop-foreground.png" });
  await render(bg, { width: 1024, height: 1024, out: "trust-loop-background.png", flatten: "#0A1130" });
  await render(mono, { width: 1024, height: 1024, out: "trust-loop-monochrome.png" });
  await render(icon, { width: 64, height: 64, out: "favicon.png", flatten: "#0A1130" });

  console.log("\nAll assets written to assets/images/");
}

main().catch((err) => {
  console.error("\nAsset generation failed:");
  console.error(err);
  process.exit(1);
});

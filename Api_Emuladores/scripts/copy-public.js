const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "src", "public");
const target = path.join(root, "public");

if (!fs.existsSync(source)) {
  console.warn(`[copy-public] Source folder not found: ${source}`);
  process.exit(0);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });
console.log(`[copy-public] Copied ${path.relative(root, source)} -> ${path.relative(root, target)}`);

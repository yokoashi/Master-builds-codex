/**
 * remove-bufferutil.cjs
 *
 * Deletes bufferutil from node_modules before electron-builder runs.
 * bufferutil is a transitive optional dep of ws that requires Visual Studio
 * to compile. Since we don't have VS on this machine we remove it so
 * electron-builder's npmRebuild pass skips it entirely.
 * ws falls back to a pure-JS implementation automatically when bufferutil
 * is absent — no functionality is lost.
 */

const fs = require("fs");
const path = require("path");

const target = path.join(__dirname, "..", "node_modules", "bufferutil");

if (fs.existsSync(target)) {
  fs.rmSync(target, { recursive: true, force: true });
  console.log("✓ Removed bufferutil from node_modules");
} else {
  console.log("✓ bufferutil already absent — nothing to do");
}

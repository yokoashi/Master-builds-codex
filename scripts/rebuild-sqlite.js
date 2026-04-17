/**
 * rebuild-sqlite.js
 *
 * Rebuilds better-sqlite3 for Electron's Node ABI using the programmatic API.
 * The CLI -w / -x flags don't reliably skip bufferutil (no Visual Studio on
 * this machine). Using onlyModules via the API guarantees only better-sqlite3
 * is touched.
 */

const { rebuild } = require("@electron/rebuild");
const path = require("path");

const projectRoot = path.join(__dirname, "..");

rebuild({
  buildPath: projectRoot,
  electronVersion: require(path.join(projectRoot, "node_modules/electron/package.json")).version,
  onlyModules: ["better-sqlite3"],
  force: true,
})
  .then(() => {
    console.log("✓ better-sqlite3 rebuilt for Electron ABI");
  })
  .catch((err) => {
    console.error("✗ Rebuild failed:", err.message);
    process.exit(1);
  });

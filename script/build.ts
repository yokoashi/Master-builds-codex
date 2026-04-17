import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, copyFile, mkdir } from "fs/promises";
import path from "path";

// Server deps to bundle into index.cjs.
// sql.js is NOT in this list — db.ts loads it via dynamic require() at
// runtime so esbuild never needs to resolve it at build time.
// drizzle-orm / drizzle-zod still needed for schema type declarations.
const allowlist = [
  "@anthropic-ai/sdk",
  "@google/generative-ai",
  "axios",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function buildAll(electron = false) {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  // sql.js is NOT in the allowlist and NOT in the externals list either —
  // it's loaded via dynamic require() in db.ts at runtime, so esbuild
  // never sees the import at all.
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Copy sql.js dist files next to index.cjs so db.ts can find them via
  // __dirname. Rename sql-wasm.js → sql-wasm.cjs so Node never treats it
  // as an ES module (package.json has "type":"module" which makes .js = ESM,
  // causing ERR_REQUIRE_ESM when require()-ing it from index.cjs).
  console.log("copying sql.js dist files to dist/...");
  const sqlJsSrc = path.join("node_modules", "sql.js", "dist");
  await copyFile(
    path.join(sqlJsSrc, "sql-wasm.wasm"),
    path.join("dist", "sql-wasm.wasm")
  );
  await copyFile(
    path.join(sqlJsSrc, "sql-wasm.js"),
    path.join("dist", "sql-wasm.cjs")  // .cjs forces CommonJS regardless of "type":"module"
  );

  if (electron) {
    console.log("building electron main + preload...");
    // Main process — CJS, targets Electron's Node version, bundles nothing
    await esbuild({
      entryPoints: ["electron/main.ts"],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/electron/main.cjs",
      external: ["electron"],
      minify: false, // keep readable for debugging
      logLevel: "info",
    });
    // Preload — must be CJS and sandboxed
    await esbuild({
      entryPoints: ["electron/preload.ts"],
      platform: "node",
      bundle: true,
      format: "cjs",
      outfile: "dist/electron/preload.cjs",
      external: ["electron"],
      minify: false,
      logLevel: "info",
    });
  }
}

const isElectron = process.argv.includes("--electron");
buildAll(isElectron).catch((err) => {
  console.error(err);
  process.exit(1);
});

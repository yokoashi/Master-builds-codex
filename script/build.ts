import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, copyFile } from "fs/promises";
import path from "path";

// Server deps to bundle — reduces openat(2) syscalls for faster cold start.
// sql.js is bundled (WASM is copied separately below).
// drizzle-orm / drizzle-zod still needed for schema type declarations.
const allowlist = [
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
  "sql.js",
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

  // Copy the sql.js WASM binary next to the server bundle so it can be
  // located at runtime via require.resolve('sql.js') → adjacent wasm path.
  console.log("copying sql-wasm.wasm...");
  await copyFile(
    path.join("node_modules", "sql.js", "dist", "sql-wasm.wasm"),
    path.join("dist", "sql-wasm.wasm")
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

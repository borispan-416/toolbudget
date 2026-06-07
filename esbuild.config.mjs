import { build } from "esbuild";

await build({
  entryPoints: ["src/cli.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outfile: "out/cli.js",
  banner: { js: "#!/usr/bin/env node" },
});
console.log("built out/cli.js");

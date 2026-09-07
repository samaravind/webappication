const { spawnSync } = require("node:child_process");
const path = require("node:path");

try {
  const nextPkg = require.resolve("next/package.json");
  const nextBin = path.join(path.dirname(nextPkg), "dist", "bin", "next");
  const child = spawnSync(
    process.execPath,
    [nextBin, ...process.argv.slice(2)],
    {
      stdio: "inherit",
    }
  );

  process.exit(child.status ?? 1);
} catch (error) {
  const child = spawnSync(
    "pnpm",
    ["exec", "next", ...process.argv.slice(2)],
    {
      stdio: "inherit",
    }
  );

  process.exit(child.status ?? 1);
}

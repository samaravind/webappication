const { spawnSync } = require("node:child_process");

let eslintBin;
try {
  eslintBin = require.resolve("eslint/bin/eslint");
} catch (error) {
  eslintBin = null;
}

let child;
if (eslintBin) {
  child = spawnSync(process.execPath, [eslintBin, ...process.argv.slice(2)], {
    stdio: "inherit",
  });
} else {
  child = spawnSync("pnpm", ["exec", "eslint", ...process.argv.slice(2)], {
    stdio: "inherit",
  });
}

process.exit(child.status ?? 1);

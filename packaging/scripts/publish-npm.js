import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import binaryMap from "./binary-map.json" with { type: "json" };
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const version = (process.env.VERSION ?? "0.0.0").replace("^", "");
const rootPkgName = "go-github-release-demo";
const npmDir = path.join(__dirname, "../npm");
const npmPkgsDir = path.join(npmDir, "packages");

// mapping targets from artifacts.json and binary-map.json
const artifactsJson = await readFile(
  path.join(__dirname, "../../dist", "artifacts.json"),
  "utf8",
).then(JSON.parse);
const targets = artifactsJson
  .filter((t) => t.goos && t.goarch && t.type === "Binary")
  .map((t) => {
    const b = binaryMap.find((b) => b.goos === t.goos && b.goarch === t.goarch);
    if (b) {
      return { ...t, ...b };
    }
    return t;
  });

// prepare root package
const rootPkgJsonPath = path.join(npmDir, "package.json");
const rootPkgJson = await readFile(rootPkgJsonPath).then(JSON.parse);
rootPkgJson.version = version;
targets.forEach((t) => {
  rootPkgJson.optionalDependencies ??= {};
  rootPkgJson.optionalDependencies[`${rootPkgName}-${t.npmos}-${t.npmcpu}`] =
    version;
});
await writeFile(rootPkgJsonPath, JSON.stringify(rootPkgJson, null, 2), "utf8");
console.log(`✅ Prepared root package.json`);

// prepare platform workspace packages
for (const t of targets) {
  const pkgName = `${rootPkgName}-${t.npmos}-${t.npmcpu}`;
  const pkgDir = path.join(npmPkgsDir, pkgName);

  // make directory
  await mkdir(pkgDir, { recursive: true });
  // package.json
  const pkgJson = {
    name: pkgName,
    version,
    description: `The ${t.name} binary for platform ${t.npmos} ${t.npmcpu}`,
    os: [t.npmos],
    cpu: [t.npmcpu],
    files: [t.name],
  };
  // write package.json
  await writeFile(
    path.join(pkgDir, "package.json"),
    JSON.stringify(pkgJson, null, 2),
    "utf8",
  );
  console.log(`✅ Prepared ${pkgName} package.json`);

  // copy binary from dist
  await copyFile(
    path.join(__dirname, "../../", t.path),
    path.join(pkgDir, t.name),
  );
  console.log(`✅ Prepared ${pkgName} binary`);
}

// publish
execSync("pnpm -r publish --provenance --access public --no-git-checks", {
  stdio: "inherit",
});
console.log(`🚀 Published all npm packages`);

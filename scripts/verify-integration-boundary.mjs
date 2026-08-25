import { readFile, readdir } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const scopePath = join(root, "third_party", "SOURCE-INTEGRATION-SCOPE.json");
const runtimeRoots = ["client", "server", "shared", "drizzle"];
const ignoredDirectories = new Set(["node_modules", "dist", ".git", ".manus-logs"]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredDirectories.has(entry.name)) continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    if (entry.isFile()) files.push(absolute);
  }
  return files;
}

const scope = JSON.parse(await readFile(scopePath, "utf8"));
const declaredExclusion = scope.excluded?.find(item => item.component === "OmniRoute" && item.status === "excluded");
if (!declaredExclusion) {
  throw new Error("SOURCE-INTEGRATION-SCOPE.json must explicitly declare OmniRoute as excluded.");
}
if (scope.approved?.some(item => item.component === "OmniRoute")) {
  throw new Error("OmniRoute cannot appear in the approved integration sources.");
}

const violations = [];
for (const runtimeRoot of runtimeRoots) {
  const files = await walk(join(root, runtimeRoot));
  for (const file of files) {
    const content = await readFile(file, "utf8");
    if (/omniroute/i.test(content)) violations.push(relative(root, file));
  }
}

if (violations.length > 0) {
  throw new Error(`OmniRoute runtime reference(s) are forbidden: ${violations.join(", ")}`);
}

console.log(JSON.stringify({
  excluded: "OmniRoute",
  verifiedRuntimeRoots: runtimeRoots,
  runtimeReferenceCount: 0,
}, null, 2));

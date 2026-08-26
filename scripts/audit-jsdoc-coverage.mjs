import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";

const projectRoot = process.cwd();
const serverRoot = join(projectRoot, "server");
const generatedReport = join(projectRoot, "docs", "JSDOC-COVERAGE.json");

/** Recursively lists TypeScript files in a directory. */
async function listTypeScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async entry => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) return listTypeScriptFiles(path);
      return entry.isFile() && path.endsWith(".ts") ? [path] : [];
    }),
  );
  return nested.flat();
}

/** Counts public exported declarations and declarations immediately preceded by a JSDoc block. */
function inspectFile(content) {
  const exports = [...content.matchAll(/^export\s+(?:async\s+)?(?:function|const|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm)].map(
    match => ({ name: match[1], index: match.index ?? 0 }),
  );
  const documentedExports = exports.filter(symbol => {
    const preceding = content.slice(0, symbol.index);
    return /\/\*\*[\s\S]*?\*\/\s*$/.test(preceding);
  });
  return {
    hasFileOverview: /^\s*\/\*\*[\s\S]*?@fileoverview[\s\S]*?\*\//.test(content),
    exportCount: exports.length,
    documentedExportCount: documentedExports.length,
    undocumentedExports: exports.filter(symbol => !documentedExports.includes(symbol)).map(symbol => symbol.name),
  };
}

const files = (await listTypeScriptFiles(serverRoot)).filter(path => !relative(serverRoot, path).startsWith("_core/"));
const reports = await Promise.all(
  files.sort().map(async path => {
    const content = await readFile(path, "utf8");
    const isTest = path.endsWith(".test.ts");
    return {
      file: relative(projectRoot, path),
      scope: isTest ? "test" : "production",
      ...inspectFile(content),
    };
  }),
);

const total = reports.reduce(
  (sum, report) => ({
    files: sum.files + 1,
    fileOverviews: sum.fileOverviews + Number(report.hasFileOverview),
    exports: sum.exports + report.exportCount,
    documentedExports: sum.documentedExports + report.documentedExportCount,
  }),
  { files: 0, fileOverviews: 0, exports: 0, documentedExports: 0 },
);

const totalsByScope = Object.fromEntries(
  ["production", "test"].map(scope => [
    scope,
    reports
      .filter(report => report.scope === scope)
      .reduce(
        (sum, report) => ({
          files: sum.files + 1,
          fileOverviews: sum.fileOverviews + Number(report.hasFileOverview),
          exports: sum.exports + report.exportCount,
          documentedExports: sum.documentedExports + report.documentedExportCount,
        }),
        { files: 0, fileOverviews: 0, exports: 0, documentedExports: 0 },
      ),
  ]),
);

await writeFile(
  generatedReport,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      scope: "server/** excluding server/_core/**",
      definition: "A production symbol is counted as documented when a JSDoc block immediately precedes its exported declaration.",
      total,
      totalsByScope,
      reports,
    },
    null,
    2,
  )}\n`,
);

console.log(JSON.stringify({ total, generatedReport: relative(projectRoot, generatedReport) }, null, 2));

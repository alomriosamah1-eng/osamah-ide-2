import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { TRPCError } from "@trpc/server";

type ExtractionOutput = { candidates: string[] };

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const adapterPath = path.join(projectRoot, "scripts", "secondbrain-extract-tasks.py");

export function extractSecondBrainTaskCandidates(content: string, includeVoicePatterns = false): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", [adapterPath], { cwd: projectRoot, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timeout = setTimeout(() => child.kill("SIGTERM"), 5_000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", chunk => { stdout += chunk; });
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => {
      clearTimeout(timeout);
      reject(new TRPCError({ code: "PRECONDITION_FAILED", message: `Second Brain extractor is unavailable: ${error.message}` }));
    });
    child.on("close", code => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new TRPCError({ code: "PRECONDITION_FAILED", message: `Second Brain extractor failed: ${stderr.trim() || `exit ${code}`}` }));
        return;
      }
      try {
        const parsed = JSON.parse(stdout) as ExtractionOutput;
        if (!Array.isArray(parsed.candidates) || parsed.candidates.some(candidate => typeof candidate !== "string")) throw new Error("invalid output");
        resolve(parsed.candidates);
      } catch {
        reject(new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Second Brain extractor returned invalid data." }));
      }
    });
    child.stdin.end(JSON.stringify({ content, includeVoicePatterns }));
  });
}

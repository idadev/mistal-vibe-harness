// Shared helpers for Vibe hooks. A hook reads a JSON payload on stdin and either
// prints nothing (passthrough) or prints {"decision":"deny","reason":...} on stdout; exit code stays 0.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";

export function readPayload() {
  try { return JSON.parse(readFileSync(0, "utf8")); } catch { return {}; }
}

export function deny(reason) {
  process.stdout.write(JSON.stringify({ decision: "deny", reason }));
  process.exit(0);
}

export const commandOf = (payload) => (typeof payload.tool_input?.command === "string" ? payload.tool_input.command : "");

// Split a shell command on unquoted ; & | and newlines, then into quote-aware tokens.
export function parseCommand(cmd) {
  const segments = [];
  let tokens = [];
  let cur = "";
  let has = false;
  let quote = "";
  const endToken = () => { if (has) tokens.push(cur); cur = ""; has = false; };
  const endSegment = () => { endToken(); if (tokens.length) segments.push(tokens); tokens = []; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (quote) {
      if (c === quote) quote = "";
      else if (c === "\\" && quote === '"' && cmd[i + 1] === '"') cur += cmd[++i];
      else cur += c;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; has = true; continue; }
    if (c === "\n" || c === ";" || c === "&" || c === "|") { endSegment(); continue; }
    if (/\s/.test(c)) { endToken(); continue; }
    cur += c;
    has = true;
  }
  endSegment();
  return segments;
}

export const baseName = (token) => path.basename(token.replace(/\\/g, "/")).toLowerCase().replace(/\.(exe|cmd|bat|ps1)$/, "");

// Drop leading VAR=value assignments and transparent wrappers (sudo, env, ...).
export function stripPrefix(tokens) {
  let i = 0;
  while (i < tokens.length && (/^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i]) || ["sudo", "env", "command", "nohup"].includes(tokens[i]))) i++;
  return tokens.slice(i);
}

// Returns { sub, args, dir } for a git command (global options skipped), or null.
export function gitInvocation(tokens) {
  const t = stripPrefix(tokens);
  if (!t.length || baseName(t[0]) !== "git") return null;
  let i = 1;
  let dir = "";
  while (i < t.length && t[i].startsWith("-")) {
    if (t[i] === "-C" && t[i + 1]) dir = t[i + 1];
    i += ["-C", "-c", "--git-dir", "--work-tree", "--namespace"].includes(t[i]) ? 2 : 1;
  }
  return { sub: t[i] ?? "", args: t.slice(i + 1), dir };
}

export function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

export function currentBranch(cwd) {
  try { return git(["branch", "--show-current"], cwd); } catch { return ""; }
}

export const protectedBranches = () =>
  new Set((process.env.VIBE_PROTECTED_BRANCHES || "develop,main,master").split(",").map((s) => s.trim()).filter(Boolean));

// Absolute, normalized path of the file a write_file / edit call targets ("" if none).
export function targetFile(payload) {
  const p = payload.tool_input?.file_path;
  return typeof p === "string" && p ? path.resolve(payload.cwd || process.cwd(), p) : "";
}

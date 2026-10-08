// Usage:
//   node cli.mjs check  <plan.json> [plan.resolved.json]   validate the plan, merge common + per-repo variables, print the recap
//   node cli.mjs report <results.json> [pipelines-report.md]   validate the results and write the Markdown report
// Exit code 1 on invalid JSON.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate.mjs";

const [cmd, input, output] = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (file) => JSON.parse(readFileSync(file, "utf8"));
const fail = (errors) => { console.error("Invalid JSON:\n" + errors.map((e) => "- " + e).join("\n")); process.exit(1); };
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|");
const SECRET = /(token|secret|password|passwd|pwd|key|credential)/i;
const mask = (k, v) => (SECRET.test(k) ? "***" : v);

if (cmd === "check" && input) {
  const plan = load(input);
  const errors = validate(plan, load(join(root, "plan.schema.json")));
  const seen = new Set();
  plan.runs?.forEach?.((r, i) => {
    const id = `${r.repo}@${r.branch}`;
    if (seen.has(id)) errors.push(`$.runs[${i}]: duplicate run ${id}`);
    seen.add(id);
    if (!/^[^\s/]+(\/[^\s/]+)+$/.test(r.repo ?? "")) errors.push(`$.runs[${i}].repo: expected group/project, got "${r.repo}"`);
    if (!r.branch || /\s/.test(r.branch)) errors.push(`$.runs[${i}].branch: empty or contains spaces`);
    for (const v of r.variables ?? []) if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(v.key)) errors.push(`$.runs[${i}]: invalid variable name "${v.key}"`);
  });
  if (errors.length) fail(errors);
  const resolved = plan.runs.map((r) => {
    const m = new Map(plan.common_variables.map((v) => [v.key, v.value]));
    for (const v of r.variables) m.set(v.key, v.value);
    return { repo: r.repo, branch: r.branch, variables: [...m].map(([key, value]) => ({ key, value })) };
  });
  writeFileSync(output ?? "pipelines-plan.resolved.json", JSON.stringify({ runs: resolved }, null, 2));
  console.log(`Plan OK: ${resolved.length} pipeline(s). Resolved plan written to ${output ?? "pipelines-plan.resolved.json"} (use it to launch).\n`);
  console.log("| # | Repo | Branch | Variables (secrets masked) |\n|---|------|--------|----------------------------|");
  resolved.forEach((r, i) => console.log(`| ${i + 1} | ${cell(r.repo)} | ${cell(r.branch)} | ${cell(r.variables.map((v) => `${v.key}=${mask(v.key, v.value)}`).join(", ") || "-")} |`));
} else if (cmd === "report" && input) {
  const data = load(input);
  const errors = validate(data, load(join(root, "results.schema.json")));
  if (errors.length) fail(errors);
  const count = (s) => data.results.filter((r) => r.status === s).length;
  const rows = data.results.map((r) =>
    `| ${[r.repo, r.branch, r.status, r.pipeline_id ?? "-", r.url ? `[link](${r.url})` : "-", r.error ?? ""].map(cell).join(" | ")} |`);
  const md = [
    "# Pipelines launched",
    `Generated: ${data.generated} - ${count("created")} created, ${count("failed")} failed, ${count("skipped")} skipped`,
    "",
    "| Repo | Branch | Status | Pipeline | Link | Error |",
    "|------|--------|--------|----------|------|-------|",
    ...rows,
    "",
  ].join("\n");
  writeFileSync(output ?? "pipelines-report.md", md);
  console.log(`Wrote ${output ?? "pipelines-report.md"} (${rows.length} rows)`);
} else {
  console.error("usage: node cli.mjs check <plan.json> [resolved.json] | node cli.mjs report <results.json> [report.md]");
  process.exit(2);
}

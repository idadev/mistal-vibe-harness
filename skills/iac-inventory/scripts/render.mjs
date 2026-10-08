// Usage: node render.mjs <iac-inventory.json> [iac-inventory.md]
// Validates the JSON against ../schema.json, then renders the Markdown table. Exit 1 on invalid JSON.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate.mjs";

const [input, output = "iac-inventory.md"] = process.argv.slice(2);
if (!input) { console.error("usage: node render.mjs <iac-inventory.json> [iac-inventory.md]"); process.exit(2); }
const schema = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "schema.json"), "utf8"));
const data = JSON.parse(readFileSync(input, "utf8"));
const errors = validate(data, schema);
if (errors.length) { console.error("Invalid JSON:\n" + errors.map((e) => "- " + e).join("\n")); process.exit(1); }

const cell = (s) => String(s).replace(/\|/g, "\\|");
const q = (v) => v ?? "?";
const pair = (c, p) => (c.status === "ok" ? `${q(p.request)} / ${q(p.limit)}` : "-");
const replicas = (c) => {
  if (c.status !== "ok") return "-";
  const { fixed, min, max } = c.replicas;
  return min !== null || max !== null ? `${q(min)}-${q(max)}` : String(q(fixed));
};
const keda = (c) => {
  if (c.status !== "ok") return "-";
  const k = c.keda;
  if (k.enabled === null) return "?";
  if (!k.enabled) return "off";
  return `on ${q(k.min)}-${q(k.max)} [${k.triggers.join(", ")}]`;
};
const rows = data.components.map((c) => {
  const notes = [...c.notes];
  if (c.status !== "ok") notes.unshift(c.status);
  return `| ${[c.component, c.repo, pair(c, c.cpu), pair(c, c.memory), replicas(c), keda(c), c.source.join(" / ") || "-", notes.join("; ")].map(cell).join(" | ")} |`;
});
const md = [
  `# IaC inventory - ${data.env}`,
  `Generated: ${data.generated} from ${data.source_file} - ${data.components.length} components`,
  "",
  "| Component | Repo | CPU req/limit | Memory req/limit | Replicas | KEDA | Source | Notes |",
  "|-----------|------|---------------|------------------|----------|------|--------|-------|",
  ...rows,
  "",
].join("\n");
writeFileSync(output, md);
console.log(`Wrote ${output} (${rows.length} rows)`);

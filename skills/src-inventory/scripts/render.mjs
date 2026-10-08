// Usage: node render.mjs <inventory.json> [inventory.md]
// Validates the JSON against ../schema.json, then renders the Markdown table. Exit 1 on invalid JSON.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate.mjs";

const [input, output = "inventory.md"] = process.argv.slice(2);
if (!input) { console.error("usage: node render.mjs <inventory.json> [inventory.md]"); process.exit(2); }
const schema = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "schema.json"), "utf8"));
const data = JSON.parse(readFileSync(input, "utf8"));
const errors = validate(data, schema);
if (errors.length) { console.error("Invalid JSON:\n" + errors.map((e) => "- " + e).join("\n")); process.exit(1); }

const cell = (s) => String(s).replace(/\|/g, "\\|");
const ver = (c, v) => (c.status === "ok" ? (v ?? "?") : "-");
const rows = data.components.map((c) => {
  const notes = [...c.notes];
  if (c.status !== "ok") notes.unshift(c.status);
  return `| ${[c.component, c.repo, ver(c, c.java), ver(c, c.spring_boot), c.source.join(" / ") || "-", notes.join("; ")].map(cell).join(" | ")} |`;
});
const md = [
  "# Java / Spring Boot inventory",
  `Generated: ${data.generated} from ${data.source_file} - ${data.components.length} repos`,
  "",
  "| Component | Repo | Java | Spring Boot | Source | Notes |",
  "|-----------|------|------|-------------|--------|-------|",
  ...rows,
  "",
].join("\n");
writeFileSync(output, md);
console.log(`Wrote ${output} (${rows.length} rows)`);

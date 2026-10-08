// Usage:
//   node cli.mjs check-impact <impact.json>                         validate one component impact file
//   node cli.mjs render <design.json> <impacts-dir> [design.md]     validate design + all impacts/*.json, write the Markdown design doc
// Exit code 1 on invalid JSON.
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate.mjs";

const [cmd, a, b, c] = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (file) => JSON.parse(readFileSync(file, "utf8"));
const fail = (errors) => { console.error("Invalid JSON:\n" + errors.map((e) => "- " + e).join("\n")); process.exit(1); };
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const list = (items, empty = "_None_") => (items.length ? items.map((i) => `- ${i}`).join("\n") : empty);

if (cmd === "check-impact" && a) {
  const errors = validate(load(a), load(join(root, "impact.schema.json")));
  const d = load(a);
  if (errors.length === 0 && d.impacted === "no" && d.changes.length) errors.push("$: impacted is \"no\" but changes is not empty");
  if (errors.length === 0 && d.impacted === "yes" && !d.files_read.length) errors.push("$: impacted is \"yes\" but files_read is empty (cite what you read)");
  if (errors.length) fail(errors);
  console.log(`OK: ${d.component} / ${d.option_id}`);
} else if (cmd === "render" && a && b) {
  const design = load(a);
  const errors = validate(design, load(join(root, "design.schema.json")));
  const impactSchema = load(join(root, "impact.schema.json"));
  const ids = new Set((design.options ?? []).map((o) => o.id));
  if (!errors.length && !ids.has(design.recommendation.option_id)) errors.push(`$.recommendation.option_id: unknown option "${design.recommendation.option_id}"`);
  const impacts = [];
  for (const f of readdirSync(b).filter((f) => f.endsWith(".json")).sort()) {
    const d = load(join(b, f));
    const e = validate(d, impactSchema, impactSchema, f);
    if (!e.length && !ids.has(d.option_id)) e.push(`${f}: unknown option_id "${d.option_id}"`);
    errors.push(...e);
    impacts.push(d);
  }
  if (errors.length) fail(errors);

  const out = [];
  out.push(`# ${design.title}`, `Date: ${design.date}`, "");
  out.push("## 1. Context", design.context, "");
  out.push("## 2. Need", design.need.problem, "", "**Goals**", list(design.need.goals), "", "**Non-goals**", list(design.need.non_goals), "");
  out.push("## 3. Constraints and assumptions", "**Constraints**", list(design.constraints), "", "**Assumptions**", list(design.assumptions), "");
  out.push("## 4. Possible solutions");
  for (const o of design.options) {
    out.push(`### ${o.id} - ${o.name}`, o.description, "", "**Pros**", list(o.pros), "", "**Cons**", list(o.cons), "",
      `**Estimated effort:** ${o.effort ?? "?"}`, "", "**Risks**", list(o.risks), "");
  }
  out.push("### Comparison", "", "| Option | Effort | Pros | Cons |", "|--------|--------|------|------|",
    ...design.options.map((o) => `| ${cell(o.id + " - " + o.name)} | ${o.effort ?? "?"} | ${o.pros.length} | ${o.cons.length} |`), "");
  const rec = design.options.find((o) => o.id === design.recommendation.option_id);
  out.push("## 5. Recommendation", `**${rec.id} - ${rec.name}**`, "", design.recommendation.rationale, "");

  out.push("## 6. Impact on components");
  for (const o of design.options) {
    const rows = impacts.filter((i) => i.option_id === o.id);
    out.push(`### Option ${o.id} - ${o.name}`);
    if (!rows.length) { out.push("_Not analyzed._", ""); continue; }
    out.push("", "| Component | Impacted | Effort | Areas | Summary |", "|-----------|----------|--------|-------|---------|",
      ...rows.map((i) => `| ${cell(i.component)} | ${i.impacted} | ${i.effort ?? "-"} | ${cell([...new Set(i.changes.map((x) => x.area))].join(", ") || "-")} | ${cell(i.summary)} |`), "");
    for (const i of rows.filter((i) => i.impacted !== "no")) {
      out.push(`#### ${i.component}${i.impacted === "to-confirm" ? " (to confirm)" : ""}`);
      for (const ch of i.changes) out.push(`- **${ch.area}**: ${ch.description}${ch.files.length ? ` (${ch.files.map((f) => "`" + f + "`").join(", ")})` : ""}`);
      if (i.dependencies.length) out.push("", "Dependencies:", ...i.dependencies.map((d) => `- ${d.kind} ${d.component}: ${d.description}`));
      if (i.risks.length) out.push("", "Risks:", ...i.risks.map((r) => `- ${r}`));
      if (i.open_questions.length) out.push("", "Open questions:", ...i.open_questions.map((q) => `- ${q}`));
      out.push("");
    }
  }
  out.push("## 7. Cross-cutting concerns", "**Deployment order**", design.cross_cutting.deployment_order.length ? design.cross_cutting.deployment_order.map((s, n) => `${n + 1}. ${s}`).join("\n") : "_None_", "",
    "**Backward compatibility**", list(design.cross_cutting.backward_compatibility), "", "**Risks**", list(design.cross_cutting.risks), "");
  const openQs = impacts.flatMap((i) => i.open_questions.map((q) => `${q} (${i.component})`));
  out.push("## 8. To validate", "| Question | Owner | Blocking |", "|----------|-------|----------|",
    ...design.to_validate.map((v) => `| ${cell(v.question)} | ${cell(v.owner ?? "?")} | ${v.blocking ? "yes" : "no"} |`), "");
  if (openQs.length) out.push("**Open questions raised by the component analysis**", list(openQs), "");
  out.push("## 9. Synthesis", design.synthesis, "");
  writeFileSync(c ?? "tech-design.md", out.join("\n"));
  console.log(`Wrote ${c ?? "tech-design.md"} (${design.options.length} options, ${impacts.length} component analyses)`);
} else {
  console.error("usage: node cli.mjs check-impact <impact.json> | node cli.mjs render <design.json> <impacts-dir> [design.md]");
  process.exit(2);
}

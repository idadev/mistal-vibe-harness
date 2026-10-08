// Usage:
//   node cli.mjs check-plan   <plan.json>                          validate the plan
//   node cli.mjs check-result <result.json>                        validate one spring-boot-migrator result
//   node cli.mjs guard <repo-dir> <migration-branch>               git safety checks before any push (exit 1 on violation)
//   node cli.mjs mr-description <result.json>                      print the MR description (Markdown) for a result
//   node cli.mjs report <report.json> [spring-boot-migration-report.md]   validate the MR results and write the Markdown report
// Exit code 1 on invalid input or guard violation.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate.mjs";

const [cmd, a, b] = process.argv.slice(2);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const load = (file) => JSON.parse(readFileSync(file, "utf8"));
const schema = (name) => load(join(root, name));
const fail = (errors) => { console.error(errors.map((e) => "- " + e).join("\n")); process.exit(1); };
const cell = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");

if (cmd === "check-plan" && a) {
  const p = load(a);
  const errors = validate(p, schema("plan.schema.json"));
  if (!errors.length) {
    if (!/^(\/|[A-Za-z]:[\\/])/.test(p.work_dir)) errors.push("$.work_dir: must be an absolute path");
    if (!/^[\w.-]+(\/[\w.-]+)+$/.test(p.migration_branch) || p.migration_branch === "develop") errors.push("$.migration_branch: invalid or equals develop");
    if (!/^\d+\.\d+(\.\d+)?([-.][A-Za-z0-9]+)*$/.test(p.target_version)) errors.push("$.target_version: expected a version like 4.0.0");
    const seen = new Set();
    p.repos.forEach((r, i) => {
      if (seen.has(r.repo)) errors.push(`$.repos[${i}]: duplicate repo ${r.repo}`);
      seen.add(r.repo);
      if (!/^[^\s/]+(\/[^\s/]+)+$/.test(r.repo)) errors.push(`$.repos[${i}].repo: expected group/project`);
    });
  }
  if (errors.length) { console.error("Invalid JSON:"); fail(errors); }
  console.log(`Plan OK: ${p.repos.length} repo(s), base ${p.base_branch}, branch ${p.migration_branch}, work dir ${p.work_dir}`);
} else if (cmd === "check-result" && a) {
  const r = load(a);
  const errors = validate(r, schema("result.schema.json"));
  if (!errors.length) {
    const committed = r.status === "migrated" || r.status === "migrated-with-issues";
    if (committed && !r.commit_sha) errors.push("$: status says changes were committed but commit_sha is null");
    if (!committed && r.commit_sha) errors.push("$: commit_sha set although nothing was committed");
    if (r.status === "migrated" && (r.build.compile !== "pass" || r.build.tests !== "pass")) errors.push("$: status migrated requires compile and tests to pass");
    if (r.status === "migrated" && r.issues.length) errors.push("$: status migrated requires no issues");
    if (r.status === "migrated-with-issues" && !r.issues.length) errors.push("$: migrated-with-issues requires at least one issue");
    if (r.status === "failed" && !r.issues.length) errors.push("$: failed requires at least one issue explaining why");
  }
  if (errors.length) { console.error("Invalid JSON:"); fail(errors); }
  console.log(`OK: ${r.repo} -> ${r.status}`);
} else if (cmd === "guard" && a && b) {
  const git = (...args) => execFileSync("git", ["-C", a, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  const succeeds = (...args) => { try { git(...args); return true; } catch { return false; } };
  const v = [];
  try {
    if (["develop", "main", "master"].includes(b)) v.push(`migration branch must not be ${b}`);
    const head = git("rev-parse", "--abbrev-ref", "HEAD");
    if (head !== b) v.push(`HEAD is on "${head}", expected "${b}"`);
    if (!succeeds("rev-parse", "--verify", "origin/develop")) v.push("origin/develop not found");
    else {
      if (!succeeds("merge-base", "--is-ancestor", "origin/develop", "HEAD")) v.push("migration branch is not based on origin/develop");
      if (git("rev-list", "--count", "origin/develop..HEAD") === "0") v.push("no commit on the migration branch");
      if (git("branch", "--list", "develop") && git("rev-list", "--count", "origin/develop..develop") !== "0") v.push("local develop has commits not on origin/develop");
    }
    for (const br of ["main", "master"]) {
      if (git("branch", "--list", br) && succeeds("rev-parse", "--verify", `origin/${br}`) && git("rev-list", "--count", `origin/${br}..${br}`) !== "0") v.push(`local ${br} has unpushed commits`);
    }
    if (git("status", "--porcelain")) v.push("working tree is not clean (uncommitted changes)");
  } catch (e) { v.push(`git error: ${String(e.message).split("\n")[0]}`); }
  if (v.length) { console.error(`GUARD FAILED for ${a}:`); fail(v); }
  console.log(`GUARD OK: ${a} (${b} is based on origin/develop, clean, develop untouched)`);
} else if (cmd === "mr-description" && a) {
  const r = load(a);
  const errors = validate(r, schema("result.schema.json"));
  if (errors.length) { console.error("Invalid JSON:"); fail(errors); }
  const out = [
    "## Spring Boot migration (OpenRewrite)", "",
    `- Recipe: \`${r.recipe ?? "?"}\` (rewrite-maven-plugin ${r.rewrite_plugin_version ?? "?"}, rewrite-spring ${r.recipe_artifact_version ?? "?"})`,
    `- Files changed: ${r.files_changed}`,
    `- Spring Boot version after: ${r.spring_boot_version_after ?? "?"}`,
    `- Compile: ${r.build.compile}, tests: ${r.build.tests}`, "", r.build.summary, "",
  ];
  if (r.issues.length) {
    out.push("## Problems to fix before merging", ...r.issues.map((i) => `- **${i.kind}**: ${i.description}${i.file ? ` (\`${i.file}\`)` : ""}`), "");
  } else out.push("No known problem: build and tests pass.", "");
  out.push("_Generated automatically. Review before merging._");
  console.log(out.join("\n"));
} else if (cmd === "report" && a) {
  const d = load(a);
  const errors = validate(d, schema("report.schema.json"));
  if (errors.length) { console.error("Invalid JSON:"); fail(errors); }
  const n = (s) => d.results.filter((r) => r.mr_status === s).length;
  const md = [
    "# Spring Boot migration",
    `Generated: ${d.generated} - ${n("created")} MR created, ${n("failed")} failed, ${n("skipped")} skipped, ${n("not-needed")} without MR`, "",
    "| Repo | Migration | MR | Link | Issues | Error |", "|------|-----------|----|------|--------|-------|",
    ...d.results.map((r) => `| ${[r.repo, r.migration_status, r.mr_status, r.mr_url ? `[MR](${r.mr_url})` : "-", r.issues_count, r.error ?? ""].map(cell).join(" | ")} |`), "",
  ].join("\n");
  writeFileSync(b ?? "spring-boot-migration-report.md", md);
  console.log(`Wrote ${b ?? "spring-boot-migration-report.md"} (${d.results.length} rows)`);
} else {
  console.error("usage: node cli.mjs check-plan|check-result|guard|mr-description|report ... (see header of this file)");
  process.exit(2);
}

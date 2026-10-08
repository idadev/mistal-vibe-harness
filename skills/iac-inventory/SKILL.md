---
name: iac-inventory
description: Build iac-inventory.md, a table of CPU, memory, replicas and KEDA settings per component from a list of Helm IaC GitLab repos (prod by default). Usage - /iac-inventory <repos.md> [env].
user-invocable: true
disable-model-invocation: true
---

# Kubernetes IaC (Helm) inventory

Input: a Markdown file listing GitLab repositories containing Helm IaC, and an optional environment name (default `prod`).
Output: `iac-inventory.md` in the current directory (tell the user before overwriting an existing one).

## 1. Read the repo list
Extract every GitLab repository from the input file, whatever its form: Markdown links, bare URLs, table rows, `group/project` paths. Ignore anything that is not a repository. Show the number of repos found.

## 2. Locate the Helm files, never clone
For each repo, on its default branch, list the tree (GitLab MCP tools if available, otherwise `glab api "projects/<encoded-path>/repository/tree?recursive=true&per_page=100"`) and find:
- `Chart.yaml` (one per chart; a repo may hold several components/charts)
- `values.yaml` of each chart
- environment values files matching the target env: `values-<env>.yaml`, `values.<env>.yaml`, `<env>/values.yaml`, `env/<env>.yaml`, `environments/<env>/...`
Read only these files. Not Helm (no `Chart.yaml`): one row with `-` and the note "non-Helm".

## 3. One row per component
A component is one deployed workload: usually one chart, or one entry of a multi-workload chart (e.g. several deployments in the values). Use the chart `name` (or workload key) as the component name.

## 4. Extract the values
Effective value = env values file, falling back to the chart's `values.yaml`. Mark which one applied.
- **CPU / memory**: `resources.requests.cpu|memory` and `resources.limits.cpu|memory`, shown as `req / limit` (e.g. `250m / 1`, `512Mi / 1Gi`).
- **Replicas**: `replicaCount` / `replicas`. If an HPA or KEDA scaling is enabled, replicas is the min-max range instead (and the fixed value is noted).
- **KEDA**: whether enabled (`keda.enabled`, a `ScaledObject` template switched on by values), `minReplicaCount`, `maxReplicaCount`, and the trigger types (`cpu`, `memory`, `kafka`, `cron`, `prometheus`...). Show as `on 2-10 [cpu, kafka]`, or `off`.
Values key names vary between charts: read the chart's templates (`templates/*.yaml`) when a key is unclear, to see which values feed `resources`, `replicas` and the `ScaledObject`.
Do not render the chart (`helm template`) and do not guess: unknown value -> `null`. If the env file is missing, use the chart defaults and say so in Notes.

## 5. Produce the JSON, then render iac-inventory.md
Output is constrained by `schema.json` in this skill's folder. Read it first and follow it exactly: same property names, no extra, none missing.
1. Write `iac-inventory.json` in the current directory: `{ "generated": "<YYYY-MM-DD>", "source_file": "<input file>", "env": "<env>", "components": [ ... ] }`, one object per component, in input order.
   - `status`: `ok`, `non-helm` (no `Chart.yaml`) or `inaccessible`. For non-ok, set every value to `null`/empty (`keda.enabled` null, `triggers` []).
   - `cpu` / `memory`: `{ "request": "250m", "limit": "1" }` as strings exactly as written in the values, `null` if not found.
   - `replicas`: `fixed` for a plain replica count; `min`/`max` when HPA or KEDA scaling is on. Unused fields `null`.
   - `keda`: `enabled` true/false (`null` if it cannot be determined), `min`, `max`, `triggers` (types such as `cpu`, `kafka`).
   - `source`: files used (e.g. `values-prod.yaml`, `values.yaml`). `notes`: short strings (env file missing so defaults used, templated value `{{ ... }}` kept as-is, multi-workload chart...).
2. Run `node <this skill folder>/scripts/render.mjs iac-inventory.json iac-inventory.md`. It validates the JSON against the schema and writes the Markdown table (`null` shown as `?`, non-ok components as `-`).
3. If it prints `Invalid JSON`, fix the listed errors and run it again. Never write `iac-inventory.md` by hand. If Node.js is not available, say so and show the JSON only.

## 6. Report
Tell the user the number of repos and components processed, how many values are `null`, and the repos that could not be read. Mention both `iac-inventory.json` and `iac-inventory.md`. For more than about 20 repos, work in batches of 10 and keep only the extracted values in context.

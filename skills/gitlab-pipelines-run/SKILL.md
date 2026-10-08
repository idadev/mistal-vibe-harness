---
name: gitlab-pipelines-run
description: Launch GitLab pipelines on a list of repos, one branch per repo, with variables (common and per-repo), using the GitLab MCP. Only launches, does not wait for results. Usage - /gitlab-pipelines-run <runs.md>.
user-invocable: true
disable-model-invocation: true
---

# Launch GitLab pipelines

Input: a Markdown file listing, for each GitLab repo, the branch and the pipeline variables. It may also have a section of variables common to all repos. A repo's own variables override a common variable with the same name.
This skill only launches pipelines. It does not wait for them nor report their final result.

## 1. Build the plan (JSON)
Output is constrained by `plan.schema.json` in this skill's folder. Read it first and follow it exactly.
Write `pipelines-plan.json` in the current directory:
`{ "source_file": "<input file>", "common_variables": [{ "key": "...", "value": "..." }], "runs": [{ "repo": "group/project", "branch": "...", "variables": [...] }] }`
- One run per repo/branch line, in input order. `variables` holds only that repo's own variables (the merge with common ones is done by the script).
- Copy names and values exactly as written. Never invent, complete or guess a value. If a repo has no branch or a needed value is unclear, ask the user before going on.

## 2. Check the plan
Run `node <this skill folder>/scripts/cli.mjs check pipelines-plan.json`.
It validates the plan (schema, duplicates, repo/variable name format), writes `pipelines-plan.resolved.json` (common and per-repo variables merged) and prints the recap with secret-looking variables masked (`token`, `secret`, `password`, `key`...). If it prints `Invalid JSON`, fix the plan and run it again.

## 3. Verify repos and branches
With the GitLab MCP tools, check each repo exists and the branch exists (get project / get branch). Mark those that do not as `skipped` with the reason; they will not be launched. If the MCP tools are not available in this session, stop and tell the user (do not fall back to guessing).

## 4. Ask for confirmation
Show the recap table (from step 2, secrets masked) and the repos that will be skipped. Ask: "Launch these N pipelines?" Launch nothing unless the user answers yes. If the user asks for a dry run, stop here.

## 5. Launch
For each run of `pipelines-plan.resolved.json` that is not skipped, in order, create a pipeline with the GitLab MCP create-pipeline tool: project = repo, ref = branch, variables = the run's variables. Pass the variables as tool parameters only.
- On an error for one repo, record it as `failed` with the error message and **continue with the next repos**.
- Do not retry, and do not re-launch a pipeline that was created.
- Record the pipeline ID and URL of each created pipeline.

## 6. Report
Write `pipelines-results.json` following `results.schema.json`: `{ "generated": "<YYYY-MM-DD>", "results": [{ "repo", "branch", "status": "created|failed|skipped", "pipeline_id", "url", "error" }] }`, one entry per run in input order (`null` for unknown fields, `error` null when created).
Then run `node <this skill folder>/scripts/cli.mjs report pipelines-results.json pipelines-report.md` (fix and rerun on `Invalid JSON`; never write the report by hand).
Tell the user how many were created, failed and skipped, and list the failures. Never print secret variable values. If Node.js is not available, say so and show the results JSON only.

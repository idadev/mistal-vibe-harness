---
name: java-migration
description: Migrate Maven repos to Java 25 with OpenRewrite and open draft merge requests on GitLab (GitLab MCP). Branch created from develop, commits only on that branch. Usage - /java-migration <repos.md> <work-dir>.
user-invocable: true
disable-model-invocation: true
---

# Java 25 migration with OpenRewrite

Input: a Markdown file listing GitLab repos, and the **work directory** where repos will be cloned (ask the user if not given). Maven projects only. JDK 25 and Maven must be installed.

Hard rules:
- The migration branch (default `chore/java-25-migration`) is always created from `develop`. All commits are made on that branch only, never on develop, main or master. Merge requests target `develop`.
- Nothing is pushed and no MR is created before the user confirms (step 5). Never force-push, never merge an MR.
- Merge requests are created as **drafts**.

## 1. Build the plan
Output is constrained by `plan.schema.json` in this skill's folder (read it first). Write `java-migration-plan.json` in the current directory: `source_file`, `work_dir` (absolute), `base_branch: "develop"`, `migration_branch`, and one entry per repo with `repo` (group/project) and `clone_url` (get it with the GitLab MCP project tool, or `glab repo view`). Never guess a clone URL.
Run `node <this skill folder>/scripts/cli.mjs check-plan java-migration-plan.json`; fix and rerun on errors.

## 2. Check the environment
Run `java -version` and `mvn -v`. If Java is not 25 or Maven is missing, stop and tell the user. Do not install anything.

## 3. Migrate each repo with the subagent
For each repo, delegate to the `java-migrator` subagent with the `task` tool: repo, clone URL, work dir, migration branch, and the absolute path of `result.schema.json`. It clones, creates the branch from `origin/develop`, applies the OpenRewrite recipe, builds, tests and commits on the migration branch. It never pushes.
- Save its JSON as `java-migration/results/<project>.json` and run `node <this skill folder>/scripts/cli.mjs check-result <file>`. On errors, send them back to the subagent once; do not edit its findings yourself.
- If a repo fails, record it and **go on with the next repos**.

## 4. Guard and recap
For every result with a commit (`migrated`, `migrated-with-issues`), run `node <this skill folder>/scripts/cli.mjs guard <local_dir> <migration_branch>`. It checks that HEAD is on the migration branch, based on `origin/develop`, with a clean tree and no local commit on develop/main/master. A repo that fails the guard is **not pushed**: tell the user why.
Show a table: repo, status, files changed, build/tests, number of issues, guard result.

## 5. Ask for confirmation
Ask: "Push the migration branches and create N draft MRs targeting develop?" Do nothing on the remote unless the user answers yes. If the user wants to review a clone first, stop here.

## 6. Push and create the draft MRs
For each repo that passed the guard, in order:
1. `git -C <local_dir> push -u origin <migration_branch>` (explicit branch, never `--force`, never push develop/main).
2. Create the MR with the GitLab MCP create-merge-request tool: source = migration branch, target = `develop`, title `Draft: chore: migrate to Java 25 (OpenRewrite)` (use the tool's draft option too if it has one), description = output of `node <this skill folder>/scripts/cli.mjs mr-description <result file>` (it lists the problems to fix).
3. On any error, record it and continue with the next repos. Do not retry a push that was accepted. Repos with status `no-changes` or `failed` get no MR (`not-needed`).

## 7. Report
Write `java-migration-report.json` following `report.schema.json` (one entry per repo, in input order, `null` when unknown), then run `node <this skill folder>/scripts/cli.mjs report java-migration-report.json java-migration-report.md`. Never write the report by hand. Tell the user the counts and list repos with issues, failures and guard violations. Needs Node.js, git and the GitLab MCP; without MCP, stop before step 6.

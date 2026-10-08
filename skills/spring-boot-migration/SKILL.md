---
name: spring-boot-migration
description: Migrate Maven Spring Boot repos to Spring Boot 4.x with OpenRewrite and open draft merge requests on GitLab (GitLab MCP). Branch created from develop, commits only on that branch. Usage - /spring-boot-migration <repos.md> <work-dir> <target-version>.
user-invocable: true
disable-model-invocation: true
---

# Spring Boot 4.x migration with OpenRewrite

Input: a Markdown file listing GitLab repos, the **work directory** where repos will be cloned, and the **target Spring Boot version** (e.g. `4.0.0`). Ask the user for whichever is missing; never pick a target version yourself. Maven projects only.
This migration assumes the Java 25 migration has already been done and merged into `develop` (JDK 25 is used to build). It is independent of that migration: it starts from `develop` in its own branch and MR.

Hard rules:
- The migration branch (default `chore/spring-boot-4-migration`) is always created from `develop`. All commits are made on that branch only, never on develop, main or master. Merge requests target `develop`.
- Nothing is pushed and no MR is created before the user confirms (step 5). Never force-push, never merge an MR.
- Merge requests are created as **drafts**.

## 1. Build the plan
Output is constrained by `plan.schema.json` in this skill's folder (read it first). Write `spring-boot-migration-plan.json` in the current directory: `source_file`, `work_dir` (absolute), `base_branch: "develop"`, `migration_branch`, `target_version`, and one entry per repo with `repo` (group/project) and `clone_url` (get it with the GitLab MCP project tool, or `glab repo view`). Never guess a clone URL.
Run `node <this skill folder>/scripts/cli.mjs check-plan spring-boot-migration-plan.json`; fix and rerun on errors.

## 2. Check the environment
Run `java -version` and `mvn -v`. JDK 25 and Maven are expected: if Java is not 25 or Maven is missing, stop and tell the user. Do not install anything.

## 3. Migrate each repo with the subagent
For each repo, delegate to the `spring-boot-migrator` subagent with the `task` tool: repo, clone URL, work dir, migration branch, target version, and the absolute path of `result.schema.json`. It clones, creates the branch from `origin/develop`, applies the OpenRewrite recipe, builds, tests and commits on the migration branch. It never pushes.
- Save its JSON as `spring-boot-migration/results/<project>.json` and run `node <this skill folder>/scripts/cli.mjs check-result <file>`. On errors, send them back to the subagent once; do not edit its findings yourself.
- If a repo fails, record it and **go on with the next repos**.

## 4. Guard and recap
For every result with a commit (`migrated`, `migrated-with-issues`), run `node <this skill folder>/scripts/cli.mjs guard <local_dir> <migration_branch>`. It checks that HEAD is on the migration branch, based on `origin/develop`, with a clean tree and no local commit on develop/main/master. A repo that fails the guard is **not pushed**: tell the user why.
Show a table: repo, status, files changed, build/tests, number of issues, guard result.

## 5. Ask for confirmation
Ask: "Push the migration branches and create N draft MRs targeting develop?" Do nothing on the remote unless the user answers yes. If the user wants to review a clone first, stop here.

## 6. Push and create the draft MRs
For each repo that passed the guard, in order:
1. `git -C <local_dir> push -u origin <migration_branch>` (explicit branch, never `--force`, never push develop/main).
2. Create the MR with the GitLab MCP create-merge-request tool: source = migration branch, target = `develop`, title `Draft: chore: migrate to Spring Boot <target version> (OpenRewrite)` (use the tool's draft option too if it has one), description = output of `node <this skill folder>/scripts/cli.mjs mr-description <result file>` (it lists the problems to fix).
3. On any error, record it and continue with the next repos. Do not retry a push that was accepted. Repos with status `no-changes` or `failed` get no MR (`not-needed`).

## 7. Report
Write `spring-boot-migration-report.json` following `report.schema.json` (one entry per repo, in input order, `null` when unknown), then run `node <this skill folder>/scripts/cli.mjs report spring-boot-migration-report.json spring-boot-migration-report.md`. Never write the report by hand. Tell the user the counts and list repos with issues, failures and guard violations. Needs Node.js, git and the GitLab MCP; without MCP, stop before step 6.

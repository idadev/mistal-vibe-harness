# mistral-vibe-harness

Source of truth for Mistral Vibe skills, agents and prompts, installed into other projects.

```
skills/<name>/SKILL.md   Agent Skills format (YAML frontmatter + instructions)
agents/<name>.toml       Agent profiles (agent_type = "subagent" for task-tool subagents)
prompts/<name>.md        System prompts referenced by system_prompt_id
scripts/install.*        Copy or symlink everything into <project>/.vibe/ or ~/.vibe
```

## Install

Local (one project, goes into `<project>/.vibe/`):
```powershell
scripts/install.ps1 -Target C:\dev\my-project
```
```sh
scripts/install.sh /path/to/my-project
```

Global (`~/.vibe`, or `$VIBE_HOME` if set):
```powershell
scripts/install.ps1 -Global
```
```sh
scripts/install.sh --global
```

Add `-Link` / `--link` to symlink instead of copy, so edits in this repo apply immediately.
Existing items with the same name are overwritten; other files are left alone.

Then in Vibe: `vibe --agent reviewer`, or `/code-review`.
Vibe only loads project skills from trusted folders.

## Manual installation

Without the scripts, copy the folders yourself. Vibe reads three subfolders of a `.vibe` directory:

| From this repo           | Local (one project)              | Global                        |
|--------------------------|----------------------------------|-------------------------------|
| `skills/<name>/`         | `<project>/.vibe/skills/<name>/` | `~/.vibe/skills/<name>/`      |
| `agents/<name>.toml`     | `<project>/.vibe/agents/`        | `~/.vibe/agents/`             |
| `prompts/<name>.md`      | `<project>/.vibe/prompts/`       | `~/.vibe/prompts/`            |

Copy the whole skill folder (not just `SKILL.md`), and install the prompt that an agent
references through `system_prompt_id` (e.g. `agents/reviewer.toml` needs `prompts/reviewer.md`).
If `VIBE_HOME` is set, replace `~/.vibe` with that path.

PowerShell, local:
```powershell
$p = "C:\dev\my-project\.vibe"
New-Item -ItemType Directory -Force "$p\skills","$p\agents","$p\prompts" | Out-Null
Copy-Item -Recurse skills\code-review "$p\skills\"
Copy-Item agents\reviewer.toml "$p\agents\"
Copy-Item prompts\reviewer.md "$p\prompts\"
```

sh, global:
```sh
mkdir -p ~/.vibe/skills ~/.vibe/agents ~/.vibe/prompts
cp -R skills/code-review ~/.vibe/skills/
cp agents/reviewer.toml ~/.vibe/agents/
cp prompts/reviewer.md ~/.vibe/prompts/
```

Alternative for skills only: instead of copying, point Vibe at this repo in `~/.vibe/config.toml`:
```toml
skill_paths = ["C:/dev/mistal-vibe-harness/skills"]
```

Check: start `vibe` in the project, type `/` to see the skills, and run `vibe --agent reviewer`.
Project-level skills only load if the folder is trusted.

## GitLab MCP (for `/gitlab-mr-review`)

The skill uses GitLab MCP tools when present and falls back to `glab`. To enable the MCP server,
declare it in `~/.vibe/config.toml` (check the exact keys against your Vibe version and the
server you use), with the token provided through the environment, never committed:
```toml
[[mcp_servers]]
name = "gitlab"
transport = "stdio"
command = "npx"
args = ["-y", "@zereight/mcp-gitlab"]
env = { GITLAB_PERSONAL_ACCESS_TOKEN = "...", GITLAB_API_URL = "https://gitlab.example.com/api/v4" }
```
Use `/mcp` in Vibe to confirm the tools are loaded. Without MCP, install and log in to `glab` (`glab auth login`).

## Catalog

| Name | Type | Files | Purpose |
|------|------|-------|---------|
| `code-review` | skill | `skills/code-review/` | Review the local `git diff`. Usage: `/code-review` |
| `reviewer` | agent (subagent) | `agents/reviewer.toml`, `prompts/reviewer.md` | Generic read-only reviewer |
| `reviewer-spring` | agent (subagent) | `agents/reviewer-spring.toml`, `prompts/reviewer-spring.md` | Read-only Spring Boot reviewer, never posts to GitLab |
| `spring-boot-review-rules` | skill | `skills/spring-boot-review-rules/` | Spring Boot checklist loaded by `reviewer-spring` (not in the `/` menu) |
| `gitlab-mr-review` | skill | `skills/gitlab-mr-review/` | Review a GitLab MR. Usage: `/gitlab-mr-review <MR number or URL>` |
| `src-inventory` | skill | `skills/src-inventory/` | Table of Java / Spring Boot versions from a list of GitLab repos. Usage: `/src-inventory <repos.md>` |
| `iac-inventory` | skill | `skills/iac-inventory/` | CPU, memory, replicas and KEDA per component from Helm IaC repos. Usage: `/iac-inventory <repos.md> [env]` |
| `gitlab-pipelines-run` | skill | `skills/gitlab-pipelines-run/` | Launch GitLab pipelines on repos/branches with variables. Usage: `/gitlab-pipelines-run <runs.md>` |
| `tech-design` | skill | `skills/tech-design/` | Technical design document with multi-component impact. Usage: `/tech-design <components.md>` |
| `component-analyst` | agent (subagent) | `agents/component-analyst.toml`, `prompts/component-analyst.md` | Read-only impact analysis of one component, used by `tech-design` |
| `java-migration` | skill | `skills/java-migration/` | Java 25 migration with OpenRewrite and draft MRs. Usage: `/java-migration <repos.md> <work-dir>` |
| `java-migrator` | agent (subagent) | `agents/java-migrator.toml`, `prompts/java-migrator.md` | Migrates one Maven repo in a clone, commits on the migration branch only, never pushes |
| `spring-boot-migration` | skill | `skills/spring-boot-migration/` | Spring Boot 4.x migration with OpenRewrite and draft MRs. Usage: `/spring-boot-migration <repos.md> <work-dir> <version>` |
| `spring-boot-migrator` | agent (subagent) | `agents/spring-boot-migrator.toml`, `prompts/spring-boot-migrator.md` | Migrates one Spring Boot repo in a clone, commits on the migration branch only, never pushes |

## Spring Boot MR review: install and usage

**Install.** `gitlab-mr-review` depends on three other items, so install all of them together
(the install scripts do this, since they copy everything):
- `skills/gitlab-mr-review/` and `skills/spring-boot-review-rules/`
- `agents/reviewer-spring.toml`
- `prompts/reviewer-spring.md` (referenced by the agent through `system_prompt_id`)

Manually, copy those four items into `<project>/.vibe/{skills,agents,prompts}/` or `~/.vibe/{skills,agents,prompts}/`
(see "Manual installation"). Then set up GitLab access: either the GitLab MCP server (see below) or `glab auth login`.

**Use.**
1. In the project, start `vibe` (the folder must be trusted for project-level skills).
2. Run `/gitlab-mr-review 123` (or a MR URL).
3. The skill fetches the MR (MCP tools first, `glab` as fallback) and delegates the analysis to the
   `reviewer-spring` subagent, which is read-only and returns findings as
   `[severity] path:LINE - problem - fix` with a verdict.
4. Vibe shows the findings, then asks whether you want the review saved as a Markdown file
   (default `reviews/mr-<id>-review.md`).
5. Vibe then asks whether to post the comments on the MR. Nothing is posted without your yes, and the MR is never approved or merged.

**Use the agent alone** (no GitLab, review of local changes with the Spring checklist):
`vibe --agent reviewer-spring`. As a subagent it can also be delegated to through the `task` tool.

## Java / Spring Boot inventory

Skill `src-inventory` (Maven projects only). Install `skills/src-inventory/` like any other skill
(scripts or manual copy). GitLab access is the same as for MR review (GitLab MCP or `glab auth login`).

Usage: `/src-inventory repos.md`, where `repos.md` lists the GitLab repos (links, URLs or `group/project` paths).
It reads `pom.xml` (Dockerfile as fallback for the Java version) through the GitLab API without cloning, and writes
`inventory.md` with one row per component: Java version, Spring Boot version, where each was found, and notes
(non-Maven, inaccessible repo, unresolved version shown as `?`).

## Helm IaC inventory

Skill `iac-inventory` (Helm only). Install `skills/iac-inventory/` like any other skill; GitLab access is the same as above.

Usage: `/iac-inventory repos.md` (environment `prod` by default) or `/iac-inventory repos.md staging`.
It finds each chart and its environment values file through the GitLab API without cloning, and writes `iac-inventory.md`
with one row per component: CPU and memory (requests / limits), replicas, KEDA (enabled, min-max, triggers), source file and notes.
Values it cannot find are shown as `?`; charts are not rendered with `helm template`.

## Constrained JSON output (`src-inventory`, `iac-inventory`)

Both inventory skills do not let the model write the Markdown table freely. Each ships a `schema.json`
(fixed property names, enums for `status`, `null` for unknown values) and a `scripts/render.mjs`:

1. Vibe extracts the data into `inventory.json` / `iac-inventory.json`, following `schema.json`.
2. `node scripts/render.mjs <json> <md>` validates the JSON against the schema and renders the Markdown table.
3. If validation fails, the script lists the errors, and Vibe fixes the JSON and runs it again.

The `.md` is therefore always generated by the script, with the same columns every time; the `.json` is kept
next to it and can be reused by other tools. This requires Node.js (no npm dependencies) on the machine running Vibe.
Note that Vibe does not enforce the schema while generating: the constraint comes from the skill instructions and the validation step.

## Launching GitLab pipelines

Skill `gitlab-pipelines-run` (explicit invocation only: the model never starts it by itself). Install `skills/gitlab-pipelines-run/`
like any other skill. It needs the GitLab MCP server (see "GitLab MCP") and Node.js.

Usage: `/gitlab-pipelines-run runs.md`, where `runs.md` lists each repo with its branch and its pipeline variables
(optionally a section of variables common to all repos; a repo's own variables override them).

1. Vibe turns the file into `pipelines-plan.json` (constrained by `plan.schema.json`); a script validates it, merges common and per-repo variables into `pipelines-plan.resolved.json` and prints a recap with secret-looking variables masked.
2. Vibe checks that each repo and branch exists (unknown ones are skipped).
3. Vibe shows the recap and asks "Launch these N pipelines?". Nothing is launched without a yes.
4. Vibe creates the pipelines with the GitLab MCP. If one fails, it records the error and **continues with the next repos**. It only launches: it does not wait for results.
5. It writes `pipelines-results.json` (constrained by `results.schema.json`) and `pipelines-report.md` (repo, branch, status, pipeline ID and link, error).

Note: `pipelines-plan.resolved.json` contains the variable values in clear text, including secrets. Delete it after the run and do not commit it.

## Technical design with multi-component impact

Skill `tech-design` + subagent `component-analyst` (explicit invocation only). Install together:
`skills/tech-design/`, `agents/component-analyst.toml`, `prompts/component-analyst.md`. Needs Node.js.

Usage: `/tech-design components.md`, where `components.md` lists each component with its name, a short description and the
**local path** of its code. Describe the feature or need in the conversation.

1. Vibe restates the need (problem, goals, non-goals, constraints, assumptions) and asks you to confirm it.
2. Vibe proposes 2-4 solution options with pros, cons, effort and risks, and asks which ones to analyze in depth
   (one sub-agent run per component and per option).
3. For each component and option, the read-only `component-analyst` subagent explores the code in its own context and returns
   a JSON impact (impacted yes / no / to-confirm, changes with verified `path:line`, dependencies, risks, open questions),
   validated against `impact.schema.json` and saved in `tech-design/impacts/`.
4. Vibe writes `tech-design/design.json` (`design.schema.json`): recommendation, cross-cutting concerns (deployment order, compatibility), points to validate, synthesis.
5. `scripts/cli.mjs render` validates everything and generates `tech-design.md`: context, need, constraints, options and comparison,
   recommendation, impact per component and option, cross-cutting concerns, to validate, synthesis.

Limits: the analysis comes from reading the code only. Runtime behavior, production data and consumers outside the listed
components are not covered; such points appear as `to-confirm` or open questions and must be checked by people.

## Java 25 migration (OpenRewrite)

Skill `java-migration` + subagent `java-migrator` (explicit invocation only). Install together: `skills/java-migration/`,
`agents/java-migrator.toml`, `prompts/java-migrator.md`. Needs JDK 25, Maven, git, Node.js and the GitLab MCP.

Usage: `/java-migration repos.md C:\work\migrations` (list of GitLab repos, and the folder where they are cloned).

1. The list becomes `java-migration-plan.json` (`plan.schema.json`), validated by a script.
2. For each repo, the `java-migrator` subagent clones it, creates the migration branch (`chore/java-25-migration`) **from `origin/develop`**,
   applies the OpenRewrite recipe, builds, runs the tests and commits **on the migration branch only**. It never pushes.
   It returns a JSON result (`result.schema.json`): status, recipe and versions used, build and tests, list of issues.
3. `cli.mjs guard` checks every clone before any push: HEAD on the migration branch, based on `origin/develop`, clean tree,
   no local commit on develop, main or master. A clone that fails is not pushed.
4. Vibe shows the recap and asks for confirmation. Nothing is pushed or created without a yes.
5. After confirmation, Vibe pushes the migration branch only (no force) and creates a **draft MR** targeting `develop`.
   When the build or tests fail, the MR is still created as a draft and its description lists the problems to fix.
   A repo with no change or a failed migration gets no MR. An error on one repo does not stop the others.
6. Report: `java-migration-report.md` (repo, migration status, MR link, number of issues, error).

Notes: the recipe `UpgradeToJava25` is checked at run time (`rewrite:discover`) and its versions are recorded in the MR description;
if it does not exist in the available `rewrite-migrate-java` version, the repo is reported as failed. The subagent's bash cannot ask
for permission (no user interaction), so the git rules are enforced by its prompt and by the guard script, not by a permission prompt.

## Spring Boot 4.x migration (OpenRewrite)

Skill `spring-boot-migration` + subagent `spring-boot-migrator` (explicit invocation only). Install together:
`skills/spring-boot-migration/`, `agents/spring-boot-migrator.toml`, `prompts/spring-boot-migrator.md`.
Needs JDK 25, Maven, git, Node.js and the GitLab MCP.

Usage: `/spring-boot-migration repos.md C:\work\migrations 4.0.0` (list of GitLab repos, clone folder, **target Spring Boot version**;
the skill asks for whichever is missing and never picks a version itself).

It follows the same flow and the same safeguards as the Java 25 migration (branch `chore/spring-boot-4-migration` created from
`origin/develop`, commits on that branch only, `guard` check before any push, confirmation before push and MRs, draft MRs targeting `develop`,
errors on one repo do not stop the others, JSON schemas for plan, results and report). The two migrations are independent: each starts from
`develop` and has its own branch and MR.

Differences:
- The recipe is not hard-coded: the subagent looks for the upgrade recipe matching the target version in `rewrite-spring` (`rewrite:discover`)
  and fails the repo if none exists.
- The Java 25 migration is assumed to be already done and merged into `develop`: the build uses JDK 25 and the skill does not upgrade Java. If a repo is clearly not on Java 25, it is flagged as an issue.
- Expect many `migrated-with-issues`: Spring Boot 4 brings Spring Framework 7, Jakarta EE 11 and Jackson changes that recipes do not fully cover.
  Compile, test, config (renamed properties) and API problems are listed in the draft MR description.

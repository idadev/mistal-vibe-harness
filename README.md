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

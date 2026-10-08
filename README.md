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

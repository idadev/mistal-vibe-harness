---
name: gitlab-mr-review
description: Review a GitLab merge request of a Spring Boot project and optionally post the findings as MR comments. Usage - /gitlab-mr-review <MR number or URL>.
user-invocable: true
disable-model-invocation: true
---

# GitLab MR review

Input: an MR number or URL (if only a number is given, the project is the current repo's GitLab remote).

## 1. Fetch the MR
Prefer the GitLab MCP tools if they are available in this session (look for tools of the gitlab server: get merge request, get merge request diffs/changes, list discussions). Otherwise fall back to the CLI:
- `glab mr view <id>` and `glab mr diff <id>`
If neither works, say so and ask the user for the diff; do not guess.

Collect: title, description, source/target branch, changed files with diffs, existing discussions (do not repeat comments already made).

## 2. Get the code locally
If the working tree is not on the MR branch, do not switch branches without asking. Use `git fetch` and read files from the MR ref when you need more context than the diff.

## 3. Review
Delegate to the `reviewer-spring` subagent with the `task` tool. Pass it the MR title, description, diff and the list of existing discussions. It returns findings as `[severity] path:LINE - problem - fix` plus a verdict.

## 4. Report
Show the user the findings grouped by severity and the verdict. Discard any finding you cannot tie to a changed line.

Then ask the user: "Do you want the review saved as a Markdown file?" If yes, write it (default path `reviews/mr-<id>-review.md` in the current project, unless the user gives another one) with: MR title and link, verdict, findings grouped by severity with `file:line`, problem and fix. Do not create the file without a yes.

## 5. Post
Always ask the user: "Do you want me to post these comments on the MR?" Do nothing on GitLab unless the answer is yes. The question is asked here, by the main session: the `reviewer-spring` subagent cannot interact with the user and never posts.

If confirmed, post one inline discussion per finding on the matching diff line (MCP create-thread/discussion tool, or `glab mr note <id> -m "..."` for a general comment), then one summary comment with the verdict. Never approve or merge the MR.

---
name: code-review
description: Review the current git diff for bugs, regressions and missing tests. Use when the user asks for a review of their changes.
user-invocable: true
allowed-tools: bash read_file grep
---

# Code review

1. Run `git diff` (and `git diff --staged`) to see the changes.
2. Read surrounding code for each changed file when context is needed.
3. Report findings ordered by severity: correctness bugs, regressions, security, missing tests, then style.
4. For each finding give `file:line`, the problem, and a concrete fix. Skip nitpicks if there are real bugs.

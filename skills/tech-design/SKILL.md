---
name: tech-design
description: Write a system-design style technical design document (context, need, options with pros/cons, impact on several components, to validate, synthesis) from a feature description and a list of components with local code paths. Usage - /tech-design <components.md>.
user-invocable: true
disable-model-invocation: true
---

# Technical design with multi-component impact

Input: a Markdown file listing the components, each with a name, a short description and the **local path** of its code. The feature or need is given by the user in the conversation (ask for it if missing).
Output: `tech-design.md`, built from JSON files validated against schemas. Working files go in `tech-design/` in the current directory (`tech-design/design.json`, `tech-design/impacts/*.json`).

## 1. Frame the need
Restate the need in your own words: problem, goals, non-goals, constraints, assumptions. Ask the user about anything unclear or missing instead of assuming, then get their confirmation before going further.

## 2. Propose the options
Propose 2 to 4 realistic solution options (`opt-1`, `opt-2`...), each with a description, pros, cons, a rough effort (S, M, L, XL) and risks. Show them to the user and ask which options to analyze in depth (default: the one you recommend, plus any the user picks). Impact analysis costs one sub-agent run per component and per option, so say how many runs that means.

## 3. Read the component list
Extract name, description and local path of each component. Check every path exists. A component with a missing path is reported to the user and left out, never guessed.

## 4. Analyze each component with the subagent
For each (option to analyze) x (component), delegate to the `component-analyst` subagent with the `task` tool. Give it: component name, path and description, the option (id and description), the feature context, and the absolute path of this skill's `impact.schema.json`.
- It returns only a JSON object. Save it as `tech-design/impacts/<component>.<option_id>.json`.
- Run `node <this skill folder>/scripts/cli.mjs check-impact <file>`. On `Invalid JSON`, send the errors back to the subagent (or fix an obvious formatting issue yourself), do not edit the substance of its findings.
- If a component fails after one retry, record it as `impacted: "to-confirm"` with the failure in `open_questions`, and go on with the next component.

## 5. Write the design
Write `tech-design/design.json` following `design.schema.json` (read it first, same property names, no extras):
- Context, need, constraints, assumptions, options (as agreed in step 2), recommendation with rationale.
- `cross_cutting`: deployment order across components, backward compatibility, global risks, derived from the component analyses (dependencies between components found by the analysts, not invented).
- `to_validate`: questions for the user and stakeholders, with an owner when known and whether they block the decision. Include the important `open_questions` from the analyses.
- `synthesis`: short conclusion (recommended option, main impacts, next steps).
The per-component impact is not copied into `design.json`: the script reads it from `tech-design/impacts/`.

## 6. Render
Run `node <this skill folder>/scripts/cli.mjs render tech-design/design.json tech-design/impacts tech-design.md`. On `Invalid JSON`, fix the listed errors and rerun. Never write `tech-design.md` by hand.

## 7. Report
Tell the user where the document is, the recommended option, the components with `to-confirm` impacts and the blocking questions. State clearly that the impact analysis comes from reading the code only: runtime behavior, production data and consumers outside the listed components are not covered and must be checked by people.
Needs Node.js. If it is missing, say so and give the JSON only.

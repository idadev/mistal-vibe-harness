---
name: src-inventory
description: Build inventory.md, a table of Java and Spring Boot versions for each GitLab repo listed in a Markdown file (Maven projects only). Usage - /src-inventory <repos.md>.
user-invocable: true
disable-model-invocation: true
---

# Java / Spring Boot version inventory

Input: a Markdown file listing GitLab repositories. Output: `inventory.md` in the current directory (overwrite only after telling the user if it already exists).

## 1. Read the repo list
Extract every GitLab repository from the input file, whatever its form: Markdown links, bare URLs, table rows, `group/project` paths. Keep the component name when the file gives one, otherwise use the project name. Ignore anything that is not a repository. Show the user the number of repos found.

## 2. Fetch files, never clone
For each repo, on its default branch, read only these files. Prefer the GitLab MCP tools (get file contents) if available in this session, otherwise `glab api "projects/<url-encoded-path>/repository/files/<url-encoded-file>/raw?ref=<branch>"`.
- `pom.xml` at the root
- `Dockerfile` at the root (only if needed, see below)
- For a multi-module project, if the root pom has neither version, also read the `pom.xml` of the first module listed in `<modules>`.

## 3. Extract the versions (Maven)
**Spring Boot**, first match wins:
1. `<parent>` with `artifactId` `spring-boot-starter-parent` -> its `<version>`.
2. `spring-boot-dependencies` imported in `<dependencyManagement>` -> its `<version>`.
3. `spring-boot-maven-plugin` or a `spring-boot.version` / `spring-boot-dependencies.version` property.
If the version is a `${property}`, resolve it from `<properties>` of the same pom (or of its parent when the parent is in the same repo). A parent that is an internal company pom is not resolved: use `null` and note "parent interne <groupId:artifactId:version>".

**Java**, first match wins:
1. `<java.version>`, then `<maven.compiler.release>`, then `<maven.compiler.source>` / `<maven.compiler.target>`, then `<release>`/`<source>` in `maven-compiler-plugin` configuration. Normalize `1.8` to `8`.
2. **If the pom has no Java version, look in the `Dockerfile`**: the JDK/JRE image in `FROM` lines (e.g. `eclipse-temurin:21-jre`, `openjdk:17`, `maven:3.9-eclipse-temurin-21`) gives the Java version. With several `FROM` lines (multi-stage), prefer the runtime stage and say so in the notes.
3. Otherwise `null`.

Never guess a version. Record where each value came from (`pom`, `Dockerfile`, `pom (property)`).

## 4. Produce the JSON, then render inventory.md
Output is constrained by `schema.json` in this skill's folder. Read it first and follow it exactly: same property names, no extra, none missing.
1. Write `inventory.json` in the current directory: `{ "generated": "<YYYY-MM-DD>", "source_file": "<input file>", "components": [ ... ] }`, one object per repo, in input order.
   - `status`: `ok`, `non-maven` (no `pom.xml`, versions `null`) or `inaccessible` (repo could not be read, versions `null`).
   - `java`: major version as a string (`"8"`, `"17"`, `"21"`) or `null` if not found. `spring_boot`: e.g. `"3.2.5"` or `null`. Never put a guess or the text `?` in them.
   - `source`: where the values were found, among `pom`, `pom (property)`, `Dockerfile`.
   - `notes`: array of short strings (multi-stage Dockerfile, internal parent pom, unresolved property...).
2. Run `node <this skill folder>/scripts/render.mjs inventory.json inventory.md`. It validates the JSON against the schema and writes the Markdown table (`null` shown as `?`, non-ok repos as `-`).
3. If it prints `Invalid JSON`, fix the listed errors in `inventory.json` and run it again. Never write `inventory.md` by hand. If Node.js is not available, say so and show the validated-by-eye JSON only.

## 5. Report
Tell the user the count of repos processed, how many have unresolved versions (`null`), and how many failed to be read. Mention both `inventory.json` and `inventory.md`. If more than about 20 repos, work in batches of 10 and keep only the extracted values in context, not the full file contents.

// Run: node --test hooks/tests
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scripts = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "scripts");

function run(script, tool_input, { cwd = process.cwd(), env = {} } = {}) {
  const r = spawnSync("node", [path.join(scripts, script)], {
    input: JSON.stringify({ hook_event_name: "pre_tool", cwd, tool_input }),
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout ? JSON.parse(r.stdout) : null;
}
const denied = (res) => assert.equal(res?.decision, "deny", JSON.stringify(res));
const passed = (res) => assert.equal(res, null);
const sh = (command, opts) => (script) => run(script, { command }, opts);

function repo(branch) {
  const dir = mkdtempSync(path.join(tmpdir(), "vibe-hooks-"));
  const g = (...a) => assert.equal(spawnSync("git", ["-c", "user.email=t@t", "-c", "user.name=t", ...a], { cwd: dir }).status, 0);
  g("init", "-q", "-b", "develop");
  mkdirSync(path.join(dir, "src/main/resources/db/migration"), { recursive: true });
  writeFileSync(path.join(dir, "src/main/resources/db/migration/V1__init.sql"), "create table a(id int);\n");
  writeFileSync(path.join(dir, "src/main/resources/db/migration/R__views.sql"), "create view v as select 1;\n");
  g("add", "-A");
  g("commit", "-q", "-m", "chore() : init");
  if (branch !== "develop") g("switch", "-q", "-c", branch);
  return dir;
}

test("guard-git", () => {
  const feature = repo("feature/x");
  const develop = repo("develop");
  try {
    for (const c of ["git push --force", "git push -f origin feature/x", "git push --force-with-lease", "git push origin +feature/x",
      "git push origin develop", "git push origin HEAD:main", "git push --all", "git push origin --delete master"]) {
      denied(sh(c, { cwd: feature })("guard-git.mjs"));
    }
    for (const c of ["git push", "git push origin HEAD"]) denied(sh(c, { cwd: develop })("guard-git.mjs"));
    denied(sh('git commit -m "chore() : x"', { cwd: develop })("guard-git.mjs"));
    denied(sh("cd x && git -C . commit --amend", { cwd: develop })("guard-git.mjs"));
    for (const c of ["git push", "git push -u origin feature/x", "git push origin HEAD", 'git commit -m "chore() : x"', "git status", "ls"]) {
      passed(sh(c, { cwd: feature })("guard-git.mjs"));
    }
    passed(sh("git push", { cwd: develop, env: { VIBE_PROTECTED_BRANCHES: "main" } })("guard-git.mjs"));
  } finally { rmSync(feature, { recursive: true, force: true }); rmSync(develop, { recursive: true, force: true }); }
});

test("commit-format", () => {
  for (const c of ['git commit -m "fix bug"', "git commit -am 'update'", 'git commit -m "chore(): x"', 'git commit --message="feat(api): x"']) {
    denied(sh(c)("commit-format.mjs"));
  }
  for (const c of ['git commit -m "chore() : met à jour"', 'git commit -m "feat(api) : ajoute x"', "git commit --amend --no-edit", "git commit -F msg.txt",
    "git commit", 'git commit -m "$(cat msg.txt)"', "git status"]) {
    passed(sh(c)("commit-format.mjs"));
  }
  passed(sh("git commit -m \"$(cat <<'EOF'\nfeat() : ajoute x\n\nCorps\nEOF\n)\"")("commit-format.mjs"));
  denied(sh("git commit -m \"$(cat <<'EOF'\najoute x\nEOF\n)\"")("commit-format.mjs"));
});

test("guard-destructive", () => {
  for (const c of ["rm -rf /", "rm -rf src", "rm -rf ../x", "rm -rf target/../src", "rm -r -f docs", "rm -rf", "rm -rf /tmp/target",
    "Remove-Item -Recurse -Force src", "git reset --hard", "git reset --hard HEAD~1", "git clean -fd", "git checkout .", "git restore ."]) {
    denied(sh(c)("guard-destructive.mjs"));
  }
  for (const c of ["rm -rf target", "rm -rf ./target node_modules", "rm file.txt", "rm -f file.txt", "git reset --soft HEAD~1", "git clean -n", "git clean -nd",
    "git checkout feature/x", "git restore src/A.java", "ls -la"]) {
    passed(sh(c)("guard-destructive.mjs"));
  }
});

test("no-secrets", () => {
  const w = (file_path, content) => run("no-secrets.mjs", { file_path, content });
  for (const [p, c] of [["/p/.env", "A=b"], ["/p/server.pem", "x"], ["/p/id_rsa", "x"],
    ["/p/a.txt", "-----BEGIN RSA PRIVATE KEY-----"], ["/p/a.txt", "k=AKIAABCDEFGHIJKLMNOP"], ["/p/a.txt", "t=glpat-abcdefghij0123456789"],
    ["/p/application.yml", "spring:\n  datasource:\n    password: hunter2hunter2"], ["/p/A.java", 'String password = "hunter22abc";']]) {
    denied(w(p, c));
  }
  for (const [p, c] of [["/p/.env.example", "A="], ["/p/application.yml", "    password: ${DB_PASSWORD}"],
    ["/p/application.yml", "    token-uri: https://idp/token"], ["/p/A.java", "String token = request.getHeader(AUTH);"],
    ["/p/A.java", 'String password = "short";'], ["/p/src/test/A.java", 'String password = "hunter22abc";'],
    ["/p/application.yml", "    password: changeme-please"], ["/p/A.java", "int x = 1;"]]) {
    passed(w(p, c));
  }
  denied(run("no-secrets.mjs", { file_path: "/p/a.yml", old_string: "a", new_string: "secret: abcdefgh1234" }));
});

test("guard-migrations", () => {
  const dir = repo("feature/x");
  const mig = (f) => path.join(dir, "src/main/resources/db/migration", f);
  const opts = { cwd: dir, env: { VIBE_BASE_REF: "develop" } };
  try {
    denied(run("guard-migrations.mjs", { file_path: mig("V1__init.sql"), content: "x" }, opts));
    denied(run("guard-migrations.mjs", { file_path: mig("V1__init.sql"), old_string: "a", new_string: "b" }, opts));
    passed(run("guard-migrations.mjs", { file_path: mig("R__views.sql"), content: "x" }, opts));
    passed(run("guard-migrations.mjs", { file_path: mig("V2__new.sql"), content: "x" }, opts)); // new file
    writeFileSync(mig("V3__draft.sql"), "select 1;\n");
    passed(run("guard-migrations.mjs", { file_path: mig("V3__draft.sql"), content: "y" }, opts)); // untracked draft
    passed(run("guard-migrations.mjs", { file_path: path.join(dir, "README.md"), content: "x" }, opts));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("guard-remote-db", () => {
  for (const c of ["mvn flyway:migrate -Dflyway.url=jdbc:postgresql://db.prod.example:5432/app", "./mvnw flyway:clean", "psql -h db.example.com -U app",
    "psql postgres://u:p@prod.example/app", "psql -U app", "flyway migrate -url=jdbc:oracle:thin:@//ora.example:1521/X", "mysql --host=10.0.0.5 -e 'select 1'"]) {
    denied(sh(c)("guard-remote-db.mjs"));
  }
  for (const c of ["mvn flyway:info -Dflyway.url=jdbc:postgresql://localhost:5432/app", "psql -h 127.0.0.1 -U app", "psql postgres://u:p@localhost/app",
    "./mvnw verify", "mvn test", "ls", "echo psql"]) {
    passed(sh(c)("guard-remote-db.mjs"));
  }
});

// pre_tool (write_file / edit): a Flyway migration already in the base branch is never modified.
// Base ref: $VIBE_BASE_REF, else origin/develop, develop, HEAD. Repeatable migrations (R__*) are exempt.
import { existsSync } from "node:fs";
import path from "node:path";
import { readPayload, deny, targetFile, git } from "./lib.mjs";

const file = targetFile(readPayload());
const norm = file.replace(/\\/g, "/");
if (!file || !/\/db\/migrations?\//.test(norm) || !/\.sql$/i.test(norm) || /\/R__[^/]*$/.test(norm) || !existsSync(file)) process.exit(0);

try {
  const dir = path.dirname(file);
  const rel = git(["rev-parse", "--show-prefix"], dir) + path.basename(file);
  const ref = [process.env.VIBE_BASE_REF, "origin/develop", "develop", "HEAD"].filter(Boolean).find((r) => {
    try { git(["rev-parse", "--verify", "--quiet", r], dir); return true; } catch { return false; }
  });
  try { git(["cat-file", "-e", `${ref}:${rel}`], dir); } catch { process.exit(0); } // not in base: still a draft
  deny(`Modification refusée : la migration « ${path.basename(file)} » existe déjà dans ${ref} et peut être appliquée ailleurs (somme de contrôle Flyway). Crée une nouvelle migration versionnée à la place.`);
} catch {
  process.exit(0); // not a git repository
}

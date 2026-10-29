// pre_tool (bash): no force-push, no push to a protected branch, no commit on a protected branch.
// Protected branches: develop,main,master (override with VIBE_PROTECTED_BRANCHES=a,b).
import path from "node:path";
import { readPayload, deny, commandOf, parseCommand, gitInvocation, currentBranch, protectedBranches } from "./lib.mjs";

const payload = readPayload();
const protectedSet = protectedBranches();
const baseCwd = payload.cwd || process.cwd();

const onProtected = (b) => `Branche protégée « ${b} » : crée une branche dédiée (git switch -c <branche>) avant de committer.`;

function checkPush(args, branch) {
  const flags = args.filter((a) => a.startsWith("-"));
  const positional = args.filter((a) => !a.startsWith("-"));
  if (flags.some((f) => /^--force/.test(f) || /^-[a-zA-Z]*f[a-zA-Z]*$/.test(f))) {
    deny("Push forcé refusé (--force, -f, --force-with-lease). Le force-push n'est jamais autorisé sans accord explicite de l'utilisateur.");
  }
  if (flags.some((f) => f === "--all" || f === "--mirror")) {
    deny("git push --all / --mirror refusé : il pousserait aussi les branches protégées. Pousse une branche précise.");
  }
  const refspecs = positional.slice(1); // first positional is the remote
  if (refspecs.length === 0) {
    const b = branch();
    if (protectedSet.has(b)) deny(`Push refusé : la branche courante « ${b} » est protégée.`);
  }
  for (const r of refspecs) {
    if (r.startsWith("+")) deny(`Push forcé refusé (refspec « ${r} »).`);
    let dest = r.includes(":") ? r.split(":").pop() : r;
    dest = dest.replace(/^refs\/heads\//, "");
    if (dest === "HEAD") dest = branch();
    if (protectedSet.has(dest)) deny(`Push refusé vers la branche protégée « ${dest} ». Pousse une branche de travail et passe par une MR.`);
  }
}

for (const tokens of parseCommand(commandOf(payload))) {
  const g = gitInvocation(tokens);
  if (!g) continue;
  const cwd = g.dir ? path.resolve(baseCwd, g.dir) : baseCwd;
  const branch = () => currentBranch(cwd);
  if (g.sub === "push") checkPush(g.args, branch);
  else if (["commit", "merge", "cherry-pick", "revert", "am"].includes(g.sub)) {
    const b = branch();
    if (protectedSet.has(b)) deny(onProtected(b));
  }
}

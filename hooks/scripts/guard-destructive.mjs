// pre_tool (bash): refuse recursive deletes outside build directories and destructive git commands.
import { readPayload, deny, commandOf, parseCommand, gitInvocation, stripPrefix, baseName } from "./lib.mjs";

const SAFE_DIRS = new Set(["target", "node_modules", "build", "dist", "out"]);
const isSafe = (p) =>
  !p.includes("..") && !/^([\\/]|[a-zA-Z]:|~)/.test(p) && !/[*?]/.test(p) &&
  SAFE_DIRS.has(p.replace(/[\\/]+$/, "").split(/[\\/]/).pop());

const refuse = (what) =>
  deny(`Commande destructive refusée (${what}). Demande la confirmation explicite de l'utilisateur, ou propose une alternative moins risquée.`);

function checkRemoval(name, rest) {
  const flags = rest.filter((a) => a.startsWith("-") || /^\/s$/i.test(a));
  const paths = rest.filter((a) => !flags.includes(a));
  const powershell = name === "remove-item" || name === "ri";
  const recursive = flags.some((f) =>
    powershell ? /^-r/i.test(f) : /^--recursive$/i.test(f) || /^-[a-zA-Z]*[rR][a-zA-Z]*$/.test(f) || /^\/s$/i.test(f));
  if (recursive && !(paths.length > 0 && paths.every(isSafe))) {
    refuse(`suppression récursive de ${paths.join(" ") || "(chemin non précisé)"}; seuls ${[...SAFE_DIRS].join(", ")} sont autorisés`);
  }
}

function checkGit({ sub, args }) {
  if (sub === "reset" && args.includes("--hard")) refuse("git reset --hard");
  if (sub === "clean" && args.some((a) => /^-[a-zA-Z]*f/.test(a) || a === "--force") && !args.some((a) => /^-[a-zA-Z]*n/.test(a) || a === "--dry-run")) {
    refuse("git clean -f");
  }
  if ((sub === "checkout" || sub === "restore") && args.includes(".")) refuse(`git ${sub} . (annule toutes les modifications locales)`);
}

for (const tokens of parseCommand(commandOf(readPayload()))) {
  const g = gitInvocation(tokens);
  if (g) { checkGit(g); continue; }
  const t = stripPrefix(tokens);
  if (!t.length) continue;
  const name = baseName(t[0]);
  if (["rm", "remove-item", "ri", "rmdir", "rd", "del", "erase"].includes(name)) checkRemoval(name, t.slice(1));
}

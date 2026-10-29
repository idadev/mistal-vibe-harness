// pre_tool (bash): commit messages must look like `type() : description` (ex. `chore() : met à jour la configuration`).
// Only messages given with -m / --message are checked; editor, -F and reused messages pass through.
import { readPayload, deny, commandOf, parseCommand, gitInvocation } from "./lib.mjs";

const FORMAT = /^[a-z]+\([^)]*\) : \S/;

function messageOf(args) {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (/^-[a-zA-Z]*m$/.test(a) && args[i + 1] !== undefined) return args[i + 1];
    if (a === "--message" && args[i + 1] !== undefined) return args[i + 1];
    if (a.startsWith("--message=")) return a.slice("--message=".length);
    if (/^-m./.test(a)) return a.slice(2);
  }
  return null;
}

const payload = readPayload();
for (const tokens of parseCommand(commandOf(payload))) {
  const g = gitInvocation(tokens);
  if (!g || g.sub !== "commit") continue;
  if (g.args.some((a) => ["-C", "-c", "--reuse-message", "--no-edit", "-F", "--file"].includes(a))) continue;
  let msg = messageOf(g.args);
  if (msg === null) continue;
  const heredoc = msg.match(/<<-?\s*['"]?(\w+)['"]?\n([\s\S]*?)\n\s*\1/);
  if (heredoc) msg = heredoc[2];
  else if (msg.includes("$(") || msg.includes("`")) continue; // cannot be verified statically
  const first = msg.split("\n").find((l) => l.trim()) ?? "";
  if (/^(fixup|squash|amend)! /.test(first) || /^Merge /.test(first)) continue;
  if (!FORMAT.test(first)) {
    deny(`Message de commit refusé : « ${first} ». Format attendu : type() : description (ex. chore() : met à jour la configuration, feat(api) : ajoute la pagination).`);
  }
}

// pre_tool (write_file / edit): refuse writing secret files or credentials in clear text.
// Heuristic: it can miss secrets and flag examples; use ${ENV_VAR} placeholders in configuration.
import path from "node:path";
import { readPayload, deny, targetFile } from "./lib.mjs";

const payload = readPayload();
const file = targetFile(payload);
if (!file) process.exit(0);
const norm = file.replace(/\\/g, "/");
const name = path.basename(norm);

const secretFile =
  (/^\.env(\..+)?$/.test(name) && !/^\.env\.(example|sample|template)$/.test(name)) ||
  /\.(pem|key|p12|pfx|jks)$/i.test(name) ||
  /^id_(rsa|ed25519|ecdsa|dsa)$/.test(name);
if (secretFile) deny(`Écriture refusée : « ${name} » est un fichier de secrets. Ne jamais l'écrire ni le committer ; documente la variable attendue dans un fichier .env.example.`);

const input = payload.tool_input ?? {};
const content = typeof input.content === "string" ? input.content : typeof input.new_string === "string" ? input.new_string : "";
if (!content || /\/src\/test\//.test(norm)) process.exit(0);

const KNOWN = [
  [/-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/, "clé privée"],
  [/AKIA[0-9A-Z]{16}/, "clé d'accès AWS"],
  [/glpat-[A-Za-z0-9_-]{20,}/, "token GitLab"],
  [/gh[pousr]_[A-Za-z0-9]{36,}/, "token GitHub"],
  [/xox[baprs]-[A-Za-z0-9-]{10,}/, "token Slack"],
];
for (const [re, label] of KNOWN) {
  if (re.test(content)) deny(`Écriture refusée : ${label} détecté(e) en clair. Utilise une variable d'environnement ou un secret store.`);
}

const ASSIGN = /(password|passwd|pwd|secret|token|api[_-]?key|private[_-]?key)["']?\s*[:=]\s*(["']?)([^\s"'#,;]{8,})/i;
const PLACEHOLDER = /^(\$|\{|<|%|\*|@|#)|\$\{|^(changeme|change-me|example|xxx|your|dummy|none|null|true|false)/i;
for (const line of content.split("\n")) {
  const m = line.match(ASSIGN);
  if (!m) continue;
  const [, , quote, value] = m;
  const codeExpression = !quote && /[()]/.test(value); // e.g. token = request.getHeader(...)
  if (!PLACEHOLDER.test(value) && !codeExpression) {
    deny(`Écriture refusée : ligne « ${line.trim().slice(0, 60)} » ressemble à un identifiant en clair. Utilise un placeholder \${VARIABLE} ; si c'est un exemple, indique-le explicitement à l'utilisateur.`);
  }
}

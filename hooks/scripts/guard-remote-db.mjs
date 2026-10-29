// pre_tool (bash): Flyway and SQL clients may only target a database whose host is explicitly local.
import { readPayload, deny, commandOf, parseCommand, stripPrefix, baseName } from "./lib.mjs";

const SQL_CLIENTS = new Set(["psql", "mysql", "mariadb", "sqlplus", "sqlcl", "sqlcmd", "pg_dump", "pg_restore", "flyway"]);
const MAVEN = new Set(["mvn", "mvnw"]);
const FLYWAY_GOAL = /flyway(-maven-plugin)?:(migrate|clean|repair|baseline|undo|info|validate)\b/;
const LOCAL = /^(localhost|127\.0\.0\.1|::1|\[::1\]|host\.docker\.internal)$/i;

function hostsIn(text) {
  const hosts = [];
  const patterns = [
    /jdbc:[a-z0-9:]+:\/\/(?:[^@/\s]*@)?([^/:\s?"']+|\[[^\]]+\])/gi,
    /(?:postgres(?:ql)?|mysql|mariadb):\/\/(?:[^@\s/]*@)?([^/:\s?"']+)/gi,
    /jdbc:oracle:thin:@(?:\/\/)?([^:/\s"']+)/gi,
    /(?:^|\s)(?:-h|--host)(?:=|\s+)([^\s"']+)/g,
  ];
  for (const re of patterns) for (const m of text.matchAll(re)) hosts.push(m[1]);
  return hosts;
}

for (const tokens of parseCommand(commandOf(readPayload()))) {
  const t = stripPrefix(tokens);
  if (!t.length) continue;
  const name = baseName(t[0]);
  const text = t.join(" ");
  const flyway = name === "flyway";
  const mavenFlyway = MAVEN.has(name) && FLYWAY_GOAL.test(text);
  if (!(SQL_CLIENTS.has(name) || mavenFlyway)) continue;
  const hosts = hostsIn(text);
  if (hosts.length === 0 || !hosts.every((h) => LOCAL.test(h))) {
    deny(`Accès base de données refusé (${name}${flyway || mavenFlyway ? " / Flyway" : ""}) : l'hôte n'est pas explicitement local (localhost, 127.0.0.1). Ne jamais cibler une base partagée ou distante ; produis le script et demande à l'utilisateur de l'exécuter.`);
  }
}

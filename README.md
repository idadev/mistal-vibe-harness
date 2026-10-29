# mistral-vibe-harness

Source de vérité des skills, agents et prompts Mistral Vibe, installés dans d'autres projets.

```
skills/<name>/SKILL.md   Format Agent Skills (frontmatter YAML + instructions)
agents/<name>.toml       Profils d'agents (agent_type = "subagent" pour les sous-agents de l'outil task)
prompts/<name>.md        Prompts système référencés par system_prompt_id
scripts/install.*        Copie ou lie tout dans <project>/.vibe/ ou ~/.vibe
```

## Installation

Locale (un projet, dans `<project>/.vibe/`) :
```powershell
scripts/install.ps1 -Target C:\dev\my-project
```
```sh
scripts/install.sh /path/to/my-project
```

Globale (`~/.vibe`, ou `$VIBE_HOME` s'il est défini) :
```powershell
scripts/install.ps1 -Global
```
```sh
scripts/install.sh --global
```

Ajouter `-Link` / `--link` pour créer des liens symboliques au lieu de copier, afin que les modifications de ce dépôt s'appliquent immédiatement.
Les éléments existants portant le même nom sont écrasés ; les autres fichiers ne sont pas touchés.

Ensuite dans Vibe : `vibe --agent reviewer`, ou `/code-review`.
Vibe ne charge les skills d'un projet que depuis des dossiers de confiance.

## Templates `AGENTS.md`

`templates/` contient des modèles de `AGENTS.md` à placer **à la racine du projet** (pas dans `.vibe/`). Le script compose le fichier
à partir d'un socle commun et des types de composants demandés :

```
templates/AGENTS.base.md                    Socle : langue, Git, limites, définition de « terminé » (toujours inclus)
templates/java-spring/AGENTS.spring-common.md   Java 25 / Spring Boot 4.x / Maven (inclus avec tout type ci-dessous sauf migration)
templates/java-spring/AGENTS.api-spec.md    api-spec  : composant API pure, contrat OpenAPI (contract-first)
templates/java-spring/AGENTS.api-impl.md    api-impl  : implémentation d'une API à partir du contrat généré
templates/java-spring/AGENTS.kafka.md       kafka     : consumer / producer Kafka
templates/java-spring/AGENTS.database.md    database  : DDL/DML (Flyway) + entités JPA
templates/AGENTS.migration.md               migration : chantier de migration Java / Spring Boot (se combine avec un autre type)
```

```powershell
scripts/install.ps1 -Target C:\dev\my-api -Agents api-impl
scripts/install.ps1 -Target C:\dev\my-consumer -Agents kafka,migration -Force
```
```sh
scripts/install.sh /path/to/my-api --agents api-impl
scripts/install.sh /path/to/my-consumer --agents kafka,migration --force
```

`--agents` s'ajoute à l'installation de `.vibe/` ; il refuse d'écraser un `AGENTS.md` existant sans `--force` / `-Force`, et n'est pas disponible avec `--global`.
Les templates partent d'hypothèses par défaut (Maven, contract-first avec openapi-generator, Flyway, messages Kafka JSON avec schéma versionné),
rappelées en commentaire dans chaque section. Les marqueurs `<!-- À COMPLÉTER -->` indiquent ce qu'il faut renseigner par projet
(nom du composant, version du contrat, topics, moteur de base de données, etc.).

## Installation manuelle

Sans les scripts, copiez les dossiers vous-même. Vibe lit trois sous-dossiers d'un répertoire `.vibe` :

| Depuis ce dépôt          | Local (un projet)                | Global                        |
|--------------------------|----------------------------------|-------------------------------|
| `skills/<name>/`         | `<project>/.vibe/skills/<name>/` | `~/.vibe/skills/<name>/`      |
| `agents/<name>.toml`     | `<project>/.vibe/agents/`        | `~/.vibe/agents/`             |
| `prompts/<name>.md`      | `<project>/.vibe/prompts/`       | `~/.vibe/prompts/`            |

Copiez le dossier complet du skill (pas seulement `SKILL.md`), et installez le prompt référencé par un agent
via `system_prompt_id` (par ex. `agents/reviewer.toml` nécessite `prompts/reviewer.md`).
Si `VIBE_HOME` est défini, remplacez `~/.vibe` par ce chemin.

PowerShell, local :
```powershell
$p = "C:\dev\my-project\.vibe"
New-Item -ItemType Directory -Force "$p\skills","$p\agents","$p\prompts" | Out-Null
Copy-Item -Recurse skills\code-review "$p\skills\"
Copy-Item agents\reviewer.toml "$p\agents\"
Copy-Item prompts\reviewer.md "$p\prompts\"
```

sh, global :
```sh
mkdir -p ~/.vibe/skills ~/.vibe/agents ~/.vibe/prompts
cp -R skills/code-review ~/.vibe/skills/
cp agents/reviewer.toml ~/.vibe/agents/
cp prompts/reviewer.md ~/.vibe/prompts/
```

Alternative pour les skills uniquement : au lieu de copier, pointez Vibe vers ce dépôt dans `~/.vibe/config.toml` :
```toml
skill_paths = ["C:/dev/mistal-vibe-harness/skills"]
```

Vérification : lancez `vibe` dans le projet, tapez `/` pour voir les skills, et exécutez `vibe --agent reviewer`.
Les skills de niveau projet ne se chargent que si le dossier est de confiance.

## GitLab MCP (pour `/gitlab-mr-review`)

Le skill utilise les outils GitLab MCP lorsqu'ils sont présents et se rabat sur `glab`. Pour activer le serveur MCP,
déclarez-le dans `~/.vibe/config.toml` (vérifiez les clés exactes selon votre version de Vibe et le
serveur utilisé), avec le token fourni par l'environnement, jamais committé :
```toml
[[mcp_servers]]
name = "gitlab"
transport = "stdio"
command = "npx"
args = ["-y", "@zereight/mcp-gitlab"]
env = { GITLAB_PERSONAL_ACCESS_TOKEN = "...", GITLAB_API_URL = "https://gitlab.example.com/api/v4" }
```
Utilisez `/mcp` dans Vibe pour confirmer que les outils sont chargés. Sans MCP, installez `glab` et connectez-vous (`glab auth login`).

## Catalogue

| Nom | Type | Fichiers | Rôle |
|-----|------|----------|------|
| `code-review` | skill | `skills/code-review/` | Revue du `git diff` local. Usage : `/code-review` |
| `reviewer` | agent (subagent) | `agents/reviewer.toml`, `prompts/reviewer.md` | Relecteur générique en lecture seule |
| `reviewer-spring` | agent (subagent) | `agents/reviewer-spring.toml`, `prompts/reviewer-spring.md` | Relecteur Spring Boot en lecture seule, ne publie jamais sur GitLab |
| `spring-boot-review-rules` | skill | `skills/spring-boot-review-rules/` | Checklist Spring Boot chargée par `reviewer-spring` (absente du menu `/`) |
| `gitlab-mr-review` | skill | `skills/gitlab-mr-review/` | Revue d'une MR GitLab. Usage : `/gitlab-mr-review <numéro ou URL de MR>` |
| `src-inventory` | skill | `skills/src-inventory/` | Tableau des versions Java / Spring Boot à partir d'une liste de dépôts GitLab. Usage : `/src-inventory <repos.md>` |
| `iac-inventory` | skill | `skills/iac-inventory/` | CPU, mémoire, réplicas et KEDA par composant à partir de dépôts IaC Helm. Usage : `/iac-inventory <repos.md> [env]` |
| `gitlab-pipelines-run` | skill | `skills/gitlab-pipelines-run/` | Lance des pipelines GitLab sur des dépôts/branches avec variables. Usage : `/gitlab-pipelines-run <runs.md>` |
| `tech-design` | skill | `skills/tech-design/` | Document de conception technique avec impact multi-composants. Usage : `/tech-design <components.md>` |
| `component-analyst` | agent (subagent) | `agents/component-analyst.toml`, `prompts/component-analyst.md` | Analyse d'impact en lecture seule d'un composant, utilisée par `tech-design` |
| `java-migration` | skill | `skills/java-migration/` | Migration vers Java 25 avec OpenRewrite et MR en brouillon. Usage : `/java-migration <repos.md> <work-dir>` |
| `java-migrator` | agent (subagent) | `agents/java-migrator.toml`, `prompts/java-migrator.md` | Migre un dépôt Maven dans un clone, committe uniquement sur la branche de migration, ne pousse jamais |
| `spring-boot-migration` | skill | `skills/spring-boot-migration/` | Migration vers Spring Boot 4.x avec OpenRewrite et MR en brouillon. Usage : `/spring-boot-migration <repos.md> <work-dir> <version>` |
| `spring-boot-migrator` | agent (subagent) | `agents/spring-boot-migrator.toml`, `prompts/spring-boot-migrator.md` | Migre un dépôt Spring Boot dans un clone, committe uniquement sur la branche de migration, ne pousse jamais |

## Revue de MR Spring Boot : installation et usage

**Installation.** `gitlab-mr-review` dépend de trois autres éléments, installez-les donc tous ensemble
(les scripts d'installation le font, puisqu'ils copient tout) :
- `skills/gitlab-mr-review/` et `skills/spring-boot-review-rules/`
- `agents/reviewer-spring.toml`
- `prompts/reviewer-spring.md` (référencé par l'agent via `system_prompt_id`)

Manuellement, copiez ces quatre éléments dans `<project>/.vibe/{skills,agents,prompts}/` ou `~/.vibe/{skills,agents,prompts}/`
(voir « Installation manuelle »). Configurez ensuite l'accès GitLab : soit le serveur GitLab MCP (voir ci-dessous), soit `glab auth login`.

**Usage.**
1. Dans le projet, lancez `vibe` (le dossier doit être de confiance pour les skills de niveau projet).
2. Exécutez `/gitlab-mr-review 123` (ou une URL de MR).
3. Le skill récupère la MR (outils MCP d'abord, `glab` en secours) et délègue l'analyse au
   sous-agent `reviewer-spring`, qui est en lecture seule et renvoie des constats sous la forme
   `[sévérité] chemin:LIGNE - problème - correctif` avec un verdict.
4. Vibe affiche les constats, puis demande si vous voulez enregistrer la revue dans un fichier Markdown
   (par défaut `reviews/mr-<id>-review.md`).
5. Vibe demande ensuite s'il faut publier les commentaires sur la MR. Rien n'est publié sans votre accord, et la MR n'est jamais approuvée ni fusionnée.

**Utiliser l'agent seul** (sans GitLab, revue de changements locaux avec la checklist Spring) :
`vibe --agent reviewer-spring`. En tant que sous-agent, on peut aussi lui déléguer du travail via l'outil `task`.

## Inventaire Java / Spring Boot

Skill `src-inventory` (projets Maven uniquement). Installez `skills/src-inventory/` comme n'importe quel autre skill
(scripts ou copie manuelle). L'accès GitLab est le même que pour la revue de MR (GitLab MCP ou `glab auth login`).

Usage : `/src-inventory repos.md`, où `repos.md` liste les dépôts GitLab (liens, URL ou chemins `group/project`).
Il lit `pom.xml` (Dockerfile en secours pour la version de Java) via l'API GitLab sans cloner, et écrit
`inventory.md` avec une ligne par composant : version de Java, version de Spring Boot, où chacune a été trouvée, et notes
(non-Maven, dépôt inaccessible, version non résolue affichée `?`).

## Inventaire IaC Helm

Skill `iac-inventory` (Helm uniquement). Installez `skills/iac-inventory/` comme n'importe quel autre skill ; l'accès GitLab est le même que ci-dessus.

Usage : `/iac-inventory repos.md` (environnement `prod` par défaut) ou `/iac-inventory repos.md staging`.
Il trouve chaque chart et son fichier de values d'environnement via l'API GitLab sans cloner, et écrit `iac-inventory.md`
avec une ligne par composant : CPU et mémoire (requests / limits), réplicas, KEDA (activé, min-max, triggers), fichier source et notes.
Les valeurs introuvables sont affichées `?` ; les charts ne sont pas rendus avec `helm template`.

## Sortie JSON contrainte (`src-inventory`, `iac-inventory`)

Ces deux skills d'inventaire ne laissent pas le modèle écrire librement le tableau Markdown. Chacun fournit un `schema.json`
(noms de propriétés fixes, enums pour `status`, `null` pour les valeurs inconnues) et un `scripts/render.mjs` :

1. Vibe extrait les données dans `inventory.json` / `iac-inventory.json`, en suivant `schema.json`.
2. `node scripts/render.mjs <json> <md>` valide le JSON par rapport au schéma et génère le tableau Markdown.
3. Si la validation échoue, le script liste les erreurs, et Vibe corrige le JSON puis relance le script.

Le `.md` est donc toujours généré par le script, avec les mêmes colonnes à chaque fois ; le `.json` est conservé
à côté et peut être réutilisé par d'autres outils. Cela nécessite Node.js (sans dépendance npm) sur la machine qui exécute Vibe.
Notez que Vibe n'impose pas le schéma pendant la génération : la contrainte vient des instructions du skill et de l'étape de validation.

## Lancement de pipelines GitLab

Skill `gitlab-pipelines-run` (invocation explicite uniquement : le modèle ne le lance jamais de lui-même). Installez `skills/gitlab-pipelines-run/`
comme n'importe quel autre skill. Il nécessite le serveur GitLab MCP (voir « GitLab MCP ») et Node.js.

Usage : `/gitlab-pipelines-run runs.md`, où `runs.md` liste chaque dépôt avec sa branche et ses variables de pipeline
(avec en option une section de variables communes à tous les dépôts ; les variables propres à un dépôt prennent le dessus).

1. Vibe transforme le fichier en `pipelines-plan.json` (contraint par `plan.schema.json`) ; un script le valide, fusionne les variables communes et propres à chaque dépôt dans `pipelines-plan.resolved.json` et affiche un récapitulatif avec les variables à l'allure de secrets masquées.
2. Vibe vérifie que chaque dépôt et chaque branche existent (les inconnus sont ignorés).
3. Vibe affiche le récapitulatif et demande « Lancer ces N pipelines ? ». Rien n'est lancé sans un oui.
4. Vibe crée les pipelines avec le GitLab MCP. Si l'un échoue, il enregistre l'erreur et **continue avec les dépôts suivants**. Il se contente de lancer : il n'attend pas les résultats.
5. Il écrit `pipelines-results.json` (contraint par `results.schema.json`) et `pipelines-report.md` (dépôt, branche, statut, ID et lien du pipeline, erreur).

Note : `pipelines-plan.resolved.json` contient les valeurs des variables en clair, y compris les secrets. Supprimez-le après l'exécution et ne le committez pas.

## Conception technique avec impact multi-composants

Skill `tech-design` + sous-agent `component-analyst` (invocation explicite uniquement). À installer ensemble :
`skills/tech-design/`, `agents/component-analyst.toml`, `prompts/component-analyst.md`. Nécessite Node.js.

Usage : `/tech-design components.md`, où `components.md` liste chaque composant avec son nom, une courte description et le
**chemin local** de son code. Décrivez la fonctionnalité ou le besoin dans la conversation.

1. Vibe reformule le besoin (problème, objectifs, non-objectifs, contraintes, hypothèses) et vous demande de le confirmer.
2. Vibe propose 2 à 4 options de solution avec avantages, inconvénients, effort et risques, et demande lesquelles analyser en profondeur
   (une exécution de sous-agent par composant et par option).
3. Pour chaque composant et chaque option, le sous-agent `component-analyst`, en lecture seule, explore le code dans son propre contexte et renvoie
   un impact en JSON (impacté oui / non / à confirmer, changements avec `path:line` vérifiés, dépendances, risques, questions ouvertes),
   validé par rapport à `impact.schema.json` et enregistré dans `tech-design/impacts/`.
4. Vibe écrit `tech-design/design.json` (`design.schema.json`) : recommandation, aspects transverses (ordre de déploiement, compatibilité), points à valider, synthèse.
5. `scripts/cli.mjs render` valide l'ensemble et génère `tech-design.md` : contexte, besoin, contraintes, options et comparaison,
   recommandation, impact par composant et par option, aspects transverses, à valider, synthèse.

Limites : l'analyse provient uniquement de la lecture du code. Le comportement à l'exécution, les données de production et les consommateurs extérieurs aux
composants listés ne sont pas couverts ; ces points apparaissent comme `to-confirm` ou questions ouvertes et doivent être vérifiés par des personnes.

## Migration vers Java 25 (OpenRewrite)

Skill `java-migration` + sous-agent `java-migrator` (invocation explicite uniquement). À installer ensemble : `skills/java-migration/`,
`agents/java-migrator.toml`, `prompts/java-migrator.md`. Nécessite JDK 25, Maven, git, Node.js et le GitLab MCP.

Usage : `/java-migration repos.md C:\work\migrations` (liste de dépôts GitLab, et dossier où ils sont clonés).

1. La liste devient `java-migration-plan.json` (`plan.schema.json`), validé par un script.
2. Pour chaque dépôt, le sous-agent `java-migrator` le clone, crée la branche de migration (`chore/java-25-migration`) **depuis `origin/develop`**,
   applique la recette OpenRewrite, compile, lance les tests et committe **uniquement sur la branche de migration**. Il ne pousse jamais.
   Il renvoie un résultat JSON (`result.schema.json`) : statut, recette et versions utilisées, build et tests, liste des problèmes.
3. `cli.mjs guard` vérifie chaque clone avant tout push : HEAD sur la branche de migration, basée sur `origin/develop`, arbre propre,
   aucun commit local sur develop, main ou master. Un clone qui échoue n'est pas poussé.
4. Vibe affiche le récapitulatif et demande confirmation. Rien n'est poussé ni créé sans un oui.
5. Après confirmation, Vibe pousse uniquement la branche de migration (sans force) et crée une **MR en brouillon** ciblant `develop`.
   Lorsque le build ou les tests échouent, la MR est tout de même créée en brouillon et sa description liste les problèmes à corriger.
   Un dépôt sans changement ou dont la migration a échoué n'a pas de MR. Une erreur sur un dépôt n'arrête pas les autres.
6. Rapport : `java-migration-report.md` (dépôt, statut de migration, lien de la MR, nombre de problèmes, erreur).

Notes : la recette `UpgradeToJava25` est vérifiée à l'exécution (`rewrite:discover`) et ses versions sont consignées dans la description de la MR ;
si elle n'existe pas dans la version disponible de `rewrite-migrate-java`, le dépôt est signalé en échec. Le bash du sous-agent ne peut pas demander
de permission (pas d'interaction utilisateur), donc les règles git sont appliquées par son prompt et par le script de garde, et non par une demande de permission.

## Migration vers Spring Boot 4.x (OpenRewrite)

Skill `spring-boot-migration` + sous-agent `spring-boot-migrator` (invocation explicite uniquement). À installer ensemble :
`skills/spring-boot-migration/`, `agents/spring-boot-migrator.toml`, `prompts/spring-boot-migrator.md`.
Nécessite JDK 25, Maven, git, Node.js et le GitLab MCP.

Usage : `/spring-boot-migration repos.md C:\work\migrations 4.0.0` (liste de dépôts GitLab, dossier de clonage, **version cible de Spring Boot** ;
le skill demande ce qui manque et ne choisit jamais de version lui-même).

Il suit le même déroulement et les mêmes garde-fous que la migration Java 25 (branche `chore/spring-boot-4-migration` créée depuis
`origin/develop`, commits sur cette branche uniquement, vérification `guard` avant tout push, confirmation avant push et MR, MR en brouillon ciblant `develop`,
les erreurs sur un dépôt n'arrêtent pas les autres, schémas JSON pour le plan, les résultats et le rapport). Les deux migrations sont indépendantes : chacune part de
`develop` et a sa propre branche et sa propre MR.

Différences :
- La recette n'est pas codée en dur : le sous-agent cherche la recette de montée de version correspondant à la version cible dans `rewrite-spring` (`rewrite:discover`)
  et met le dépôt en échec s'il n'en existe aucune.
- La migration Java 25 est supposée déjà faite et fusionnée dans `develop` : le build utilise JDK 25 et le skill ne met pas Java à niveau. Si un dépôt n'est manifestement pas en Java 25, il est signalé comme problème.
- Attendez-vous à de nombreux `migrated-with-issues` : Spring Boot 4 apporte Spring Framework 7, Jakarta EE 11 et des changements Jackson que les recettes ne couvrent pas entièrement.
  Les problèmes de compilation, de tests, de configuration (propriétés renommées) et d'API sont listés dans la description de la MR en brouillon.

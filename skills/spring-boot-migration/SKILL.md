---
name: spring-boot-migration
description: Migre des dépôts Maven Spring Boot vers Spring Boot 4.x avec OpenRewrite et ouvre des merge requests en brouillon sur GitLab (GitLab MCP). Branche créée depuis develop, commits uniquement sur cette branche. Usage - /spring-boot-migration <repos.md> <work-dir> <target-version>.
user-invocable: true
disable-model-invocation: true
---

# Migration vers Spring Boot 4.x avec OpenRewrite

Entrée : un fichier Markdown listant des dépôts GitLab, le **répertoire de travail** où les dépôts seront clonés, et la **version cible de Spring Boot** (par ex. `4.0.0`). Demander à l'utilisateur ce qui manque ; ne jamais choisir soi-même une version cible. Projets Maven uniquement.
Cette migration suppose que la migration Java 25 a déjà été faite et fusionnée dans `develop` (JDK 25 est utilisé pour compiler). Elle est indépendante de cette migration : elle part de `develop` dans sa propre branche et sa propre MR.

Règles impératives :
- La branche de migration (par défaut `chore/spring-boot-4-migration`) est toujours créée depuis `develop`. Tous les commits sont faits sur cette branche uniquement, jamais sur develop, main ou master. Les merge requests ciblent `develop`.
- Rien n'est poussé et aucune MR n'est créée avant la confirmation de l'utilisateur (étape 5). Ne jamais faire de force-push, ne jamais fusionner une MR.
- Les merge requests sont créées en **brouillon (draft)**.

## 1. Construire le plan
La sortie est contrainte par `plan.schema.json` dans le dossier de ce skill (le lire d'abord). Écrire `spring-boot-migration-plan.json` dans le répertoire courant : `source_file`, `work_dir` (absolu), `base_branch: "develop"`, `migration_branch`, `target_version`, et une entrée par dépôt avec `repo` (group/project) et `clone_url` (l'obtenir avec l'outil projet du GitLab MCP, ou `glab repo view`). Ne jamais deviner une URL de clonage.
Exécuter `node <this skill folder>/scripts/cli.mjs check-plan spring-boot-migration-plan.json` ; corriger et relancer en cas d'erreurs.

## 2. Vérifier l'environnement
Exécuter `java -version` et `mvn -v`. JDK 25 et Maven sont attendus : si Java n'est pas en version 25 ou si Maven est absent, s'arrêter et prévenir l'utilisateur. Ne rien installer.

## 3. Migrer chaque dépôt avec le sous-agent
Pour chaque dépôt, déléguer au sous-agent `spring-boot-migrator` avec l'outil `task` : dépôt, URL de clonage, répertoire de travail, branche de migration, version cible, et chemin absolu de `result.schema.json`. Il clone, crée la branche depuis `origin/develop`, applique la recette OpenRewrite, compile, teste et committe sur la branche de migration. Il ne pousse jamais.
- Enregistrer son JSON sous `spring-boot-migration/results/<project>.json` et exécuter `node <this skill folder>/scripts/cli.mjs check-result <file>`. En cas d'erreurs, les renvoyer une fois au sous-agent ; ne pas modifier soi-même ses constats.
- Si un dépôt échoue, l'enregistrer et **passer aux dépôts suivants**.

## 4. Garde et récapitulatif
Pour chaque résultat avec un commit (`migrated`, `migrated-with-issues`), exécuter `node <this skill folder>/scripts/cli.mjs guard <local_dir> <migration_branch>`. Il vérifie que HEAD est sur la branche de migration, basée sur `origin/develop`, avec un arbre propre et aucun commit local sur develop/main/master. Un dépôt qui échoue à la garde **n'est pas poussé** : en expliquer la raison à l'utilisateur.
Afficher un tableau : dépôt, statut, fichiers modifiés, build/tests, nombre de problèmes, résultat de la garde.

## 5. Demander confirmation
Demander : « Pousser les branches de migration et créer N MR en brouillon ciblant develop ? » Ne rien faire sur le remote sauf si l'utilisateur répond oui. Si l'utilisateur veut d'abord examiner un clone, s'arrêter ici.

## 6. Pousser et créer les MR en brouillon
Pour chaque dépôt ayant passé la garde, dans l'ordre :
1. `git -C <local_dir> push -u origin <migration_branch>` (branche explicite, jamais `--force`, jamais de push de develop/main).
2. Créer la MR avec l'outil create-merge-request du GitLab MCP : source = branche de migration, cible = `develop`, titre `Draft: chore: migrate to Spring Boot <target version> (OpenRewrite)` (utiliser aussi l'option draft de l'outil s'il en a une), description = sortie de `node <this skill folder>/scripts/cli.mjs mr-description <result file>` (elle liste les problèmes à corriger).
3. En cas d'erreur, l'enregistrer et continuer avec les dépôts suivants. Ne pas réessayer un push qui a été accepté. Les dépôts au statut `no-changes` ou `failed` n'ont pas de MR (`not-needed`).

## 7. Rapport
Écrire `spring-boot-migration-report.json` en suivant `report.schema.json` (une entrée par dépôt, dans l'ordre de l'entrée, `null` quand inconnu), puis exécuter `node <this skill folder>/scripts/cli.mjs report spring-boot-migration-report.json spring-boot-migration-report.md`. Ne jamais écrire le rapport à la main. Indiquer à l'utilisateur les totaux et lister les dépôts avec problèmes, échecs et violations de la garde. Nécessite Node.js, git et le GitLab MCP ; sans MCP, s'arrêter avant l'étape 6.

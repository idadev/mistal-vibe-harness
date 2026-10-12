---
name: gitlab-pipelines-run
description: Lance des pipelines GitLab sur une liste de dépôts, une branche par dépôt, avec des variables (communes et par dépôt), via le GitLab MCP. Lance uniquement, n'attend pas les résultats. Usage - /gitlab-pipelines-run <runs.md>.
user-invocable: true
disable-model-invocation: true
---

# Lancer des pipelines GitLab

Entrée : un fichier Markdown listant, pour chaque dépôt GitLab, la branche et les variables de pipeline. Il peut aussi contenir une section de variables communes à tous les dépôts. Les variables propres à un dépôt prennent le dessus sur une variable commune du même nom.
Ce skill lance uniquement des pipelines. Il ne les attend pas et n'en rapporte pas le résultat final.

## 1. Construire le plan (JSON)
La sortie est contrainte par `plan.schema.json` dans le dossier de ce skill. Le lire d'abord et le suivre exactement.
Écrire `pipelines-plan.json` dans le répertoire courant :
`{ "source_file": "<input file>", "common_variables": [{ "key": "...", "value": "..." }], "runs": [{ "repo": "group/project", "branch": "...", "variables": [...] }] }`
- Une exécution (run) par ligne dépôt/branche, dans l'ordre de l'entrée. `variables` ne contient que les variables propres à ce dépôt (la fusion avec les variables communes est faite par le script).
- Copier les noms et valeurs exactement comme écrits. Ne jamais inventer, compléter ou deviner une valeur. Si un dépôt n'a pas de branche ou si une valeur nécessaire n'est pas claire, demander à l'utilisateur avant de continuer.

## 2. Vérifier le plan
Exécuter `node <this skill folder>/scripts/cli.mjs check pipelines-plan.json`.
Il valide le plan (schéma, doublons, format des noms de dépôts/variables), écrit `pipelines-plan.resolved.json` (variables communes et par dépôt fusionnées) et affiche le récapitulatif avec les variables à l'allure de secrets masquées (`token`, `secret`, `password`, `key`...). S'il affiche `Invalid JSON`, corriger le plan et le relancer.

## 3. Vérifier les dépôts et les branches
Avec les outils GitLab MCP, vérifier que chaque dépôt existe et que la branche existe (get project / get branch). Marquer ceux qui n'existent pas comme `skipped` avec la raison ; ils ne seront pas lancés. Si les outils MCP ne sont pas disponibles dans cette session, s'arrêter et prévenir l'utilisateur (ne pas se rabattre sur des suppositions).

## 4. Demander confirmation
Afficher le tableau récapitulatif (de l'étape 2, secrets masqués) et les dépôts qui seront ignorés. Demander : « Lancer ces N pipelines ? » Ne rien lancer sauf si l'utilisateur répond oui. Si l'utilisateur demande une simulation (dry run), s'arrêter ici.

## 5. Lancer
Pour chaque exécution de `pipelines-plan.resolved.json` qui n'est pas ignorée, dans l'ordre, créer un pipeline avec l'outil GitLab MCP create-pipeline : project = dépôt, ref = branche, variables = les variables de l'exécution. Passer les variables uniquement comme paramètres de l'outil.
- En cas d'erreur sur un dépôt, l'enregistrer comme `failed` avec le message d'erreur et **continuer avec les dépôts suivants**.
- Ne pas réessayer, et ne pas relancer un pipeline déjà créé.
- Enregistrer l'ID et l'URL de chaque pipeline créé.

## 6. Rapport
Écrire `pipelines-results.json` en suivant `results.schema.json` : `{ "generated": "<YYYY-MM-DD>", "results": [{ "repo", "branch", "status": "created|failed|skipped", "pipeline_id", "url", "error" }] }`, une entrée par exécution dans l'ordre de l'entrée (`null` pour les champs inconnus, `error` à null quand créé).
Puis exécuter `node <this skill folder>/scripts/cli.mjs report pipelines-results.json pipelines-report.md` (corriger et relancer en cas de `Invalid JSON` ; ne jamais écrire le rapport à la main).
Indiquer à l'utilisateur combien ont été créés, ont échoué et ont été ignorés, et lister les échecs. Ne jamais afficher les valeurs des variables secrètes. Si Node.js n'est pas disponible, le dire et afficher uniquement le JSON des résultats.

---
name: iac-inventory
description: Construit iac-inventory.md, un tableau des paramètres CPU, mémoire, réplicas et KEDA par composant à partir d'une liste de dépôts GitLab d'IaC Helm (prod par défaut). Usage - /iac-inventory <repos.md> [env].
user-invocable: true
disable-model-invocation: true
---

# Inventaire IaC Kubernetes (Helm)

Entrée : un fichier Markdown listant des dépôts GitLab contenant de l'IaC Helm, et un nom d'environnement optionnel (`prod` par défaut).
Sortie : `iac-inventory.md` dans le répertoire courant (prévenir l'utilisateur avant d'écraser un fichier existant).

## 1. Lire la liste des dépôts
Extraire chaque dépôt GitLab du fichier d'entrée, quelle que soit sa forme : liens Markdown, URL nues, lignes de tableau, chemins `group/project`. Ignorer tout ce qui n'est pas un dépôt. Indiquer le nombre de dépôts trouvés.

## 2. Localiser les fichiers Helm, ne jamais cloner
Pour chaque dépôt, sur sa branche par défaut, lister l'arborescence (outils GitLab MCP si disponibles, sinon `glab api "projects/<encoded-path>/repository/tree?recursive=true&per_page=100"`) et trouver :
- `Chart.yaml` (un par chart ; un dépôt peut contenir plusieurs composants/charts)
- `values.yaml` de chaque chart
- les fichiers de values d'environnement correspondant à l'env cible : `values-<env>.yaml`, `values.<env>.yaml`, `<env>/values.yaml`, `env/<env>.yaml`, `environments/<env>/...`
Lire uniquement ces fichiers. Pas Helm (pas de `Chart.yaml`) : une ligne avec `-` et la note "non-Helm".

## 3. Une ligne par composant
Un composant est une charge de travail déployée : généralement un chart, ou une entrée d'un chart multi-workloads (par ex. plusieurs deployments dans les values). Utiliser le `name` du chart (ou la clé du workload) comme nom du composant.

## 4. Extraire les valeurs
Valeur effective = fichier de values de l'env, avec repli sur le `values.yaml` du chart. Indiquer lequel s'est appliqué.
- **CPU / mémoire** : `resources.requests.cpu|memory` et `resources.limits.cpu|memory`, affichés `req / limit` (par ex. `250m / 1`, `512Mi / 1Gi`).
- **Réplicas** : `replicaCount` / `replicas`. Si un HPA ou un scaling KEDA est activé, les réplicas sont la plage min-max à la place (et la valeur fixe est notée).
- **KEDA** : s'il est activé (`keda.enabled`, un template `ScaledObject` activé par les values), `minReplicaCount`, `maxReplicaCount`, et les types de triggers (`cpu`, `memory`, `kafka`, `cron`, `prometheus`...). Afficher sous la forme `on 2-10 [cpu, kafka]`, ou `off`.
Les noms de clés des values varient selon les charts : lire les templates du chart (`templates/*.yaml`) quand une clé n'est pas claire, pour voir quelles values alimentent `resources`, `replicas` et le `ScaledObject`.
Ne pas rendre le chart (`helm template`) et ne pas deviner : valeur inconnue -> `null`. Si le fichier d'env est absent, utiliser les valeurs par défaut du chart et l'indiquer dans les Notes.

## 5. Produire le JSON, puis générer iac-inventory.md
La sortie est contrainte par `schema.json` dans le dossier de ce skill. Le lire d'abord et le suivre exactement : mêmes noms de propriétés, aucune en trop, aucune manquante.
1. Écrire `iac-inventory.json` dans le répertoire courant : `{ "generated": "<YYYY-MM-DD>", "source_file": "<input file>", "env": "<env>", "components": [ ... ] }`, un objet par composant, dans l'ordre de l'entrée.
   - `status` : `ok`, `non-helm` (pas de `Chart.yaml`) ou `inaccessible`. Pour un statut non ok, mettre toutes les valeurs à `null`/vide (`keda.enabled` null, `triggers` []).
   - `cpu` / `memory` : `{ "request": "250m", "limit": "1" }` en chaînes exactement comme écrites dans les values, `null` si introuvable.
   - `replicas` : `fixed` pour un nombre de réplicas simple ; `min`/`max` quand le scaling HPA ou KEDA est activé. Champs inutilisés à `null`.
   - `keda` : `enabled` true/false (`null` s'il ne peut pas être déterminé), `min`, `max`, `triggers` (types tels que `cpu`, `kafka`).
   - `source` : fichiers utilisés (par ex. `values-prod.yaml`, `values.yaml`). `notes` : courtes chaînes (fichier d'env absent donc valeurs par défaut utilisées, valeur templatée `{{ ... }}` conservée telle quelle, chart multi-workloads...).
2. Exécuter `node <this skill folder>/scripts/render.mjs iac-inventory.json iac-inventory.md`. Il valide le JSON par rapport au schéma et écrit le tableau Markdown (`null` affiché `?`, composants non ok affichés `-`).
3. S'il affiche `Invalid JSON`, corriger les erreurs listées et le relancer. Ne jamais écrire `iac-inventory.md` à la main. Si Node.js n'est pas disponible, le dire et afficher uniquement le JSON.

## 6. Rapport
Indiquer à l'utilisateur le nombre de dépôts et de composants traités, combien de valeurs sont `null`, et les dépôts qui n'ont pas pu être lus. Mentionner `iac-inventory.json` et `iac-inventory.md`. Au-delà d'environ 20 dépôts, travailler par lots de 10 et ne garder en contexte que les valeurs extraites.

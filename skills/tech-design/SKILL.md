---
name: tech-design
description: Rédige un document de conception technique de type system design (contexte, besoin, options avec avantages/inconvénients, impact sur plusieurs composants, à valider, synthèse) à partir d'une description de fonctionnalité et d'une liste de composants avec chemins de code locaux. Usage - /tech-design <components.md>.
user-invocable: true
disable-model-invocation: true
---

# Conception technique avec impact multi-composants

Entrée : un fichier Markdown listant les composants, chacun avec un nom, une courte description et le **chemin local** de son code. La fonctionnalité ou le besoin est donné par l'utilisateur dans la conversation (le demander s'il manque).
Sortie : `tech-design.md`, construit à partir de fichiers JSON validés par des schémas. Les fichiers de travail vont dans `tech-design/` dans le répertoire courant (`tech-design/design.json`, `tech-design/impacts/*.json`).

## 1. Cadrer le besoin
Reformuler le besoin avec ses propres mots : problème, objectifs, non-objectifs, contraintes, hypothèses. Interroger l'utilisateur sur tout ce qui est flou ou manquant plutôt que de supposer, puis obtenir sa confirmation avant d'aller plus loin.

## 2. Proposer les options
Proposer 2 à 4 options de solution réalistes (`opt-1`, `opt-2`...), chacune avec une description, des avantages, des inconvénients, un effort approximatif (S, M, L, XL) et des risques. Les présenter à l'utilisateur et demander lesquelles analyser en profondeur (par défaut : celle qu'on recommande, plus celles que l'utilisateur choisit). L'analyse d'impact coûte une exécution de sous-agent par composant et par option : indiquer combien d'exécutions cela représente.

## 3. Lire la liste des composants
Extraire le nom, la description et le chemin local de chaque composant. Vérifier que chaque chemin existe. Un composant dont le chemin est absent est signalé à l'utilisateur et écarté, jamais deviné.

## 4. Analyser chaque composant avec le sous-agent
Pour chaque (option à analyser) x (composant), déléguer au sous-agent `component-analyst` avec l'outil `task`. Lui donner : nom, chemin et description du composant, l'option (id et description), le contexte de la fonctionnalité, et le chemin absolu du `impact.schema.json` de ce skill.
- Il ne renvoie qu'un objet JSON. L'enregistrer sous `tech-design/impacts/<component>.<option_id>.json`.
- Exécuter `node <this skill folder>/scripts/cli.mjs check-impact <file>`. En cas de `Invalid JSON`, renvoyer les erreurs au sous-agent (ou corriger soi-même un problème de format évident), sans modifier le fond de ses constats.
- Si un composant échoue après une nouvelle tentative, l'enregistrer avec `impacted: "to-confirm"` et l'échec dans `open_questions`, puis passer au composant suivant.

## 5. Écrire la conception
Écrire `tech-design/design.json` en suivant `design.schema.json` (le lire d'abord, mêmes noms de propriétés, aucune en trop) :
- Contexte, besoin, contraintes, hypothèses, options (telles que convenues à l'étape 2), recommandation avec justification.
- `cross_cutting` : ordre de déploiement entre composants, rétrocompatibilité, risques globaux, déduits des analyses de composants (dépendances entre composants trouvées par les analystes, non inventées).
- `to_validate` : questions pour l'utilisateur et les parties prenantes, avec un responsable quand il est connu et indiquant si elles bloquent la décision. Y inclure les `open_questions` importantes des analyses.
- `synthesis` : courte conclusion (option recommandée, principaux impacts, prochaines étapes).
L'impact par composant n'est pas copié dans `design.json` : le script le lit depuis `tech-design/impacts/`.

## 6. Générer
Exécuter `node <this skill folder>/scripts/cli.mjs render tech-design/design.json tech-design/impacts tech-design.md`. En cas de `Invalid JSON`, corriger les erreurs listées et relancer. Ne jamais écrire `tech-design.md` à la main.

## 7. Rapport
Indiquer à l'utilisateur où se trouve le document, l'option recommandée, les composants avec des impacts `to-confirm` et les questions bloquantes. Préciser clairement que l'analyse d'impact provient uniquement de la lecture du code : le comportement à l'exécution, les données de production et les consommateurs extérieurs aux composants listés ne sont pas couverts et doivent être vérifiés par des personnes.
Nécessite Node.js. S'il est absent, le dire et fournir uniquement le JSON.

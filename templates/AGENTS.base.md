# AGENTS.md

Instructions pour les agents de code (Mistral Vibe) travaillant dans ce dépôt.

## Projet
- Composant : <!-- À COMPLÉTER : nom et rôle du composant en une phrase -->
- Équipe / contact : <!-- À COMPLÉTER -->
- Documentation utile : <!-- À COMPLÉTER : liens (design, runbook, contrat) -->

## Langue et style
- Répondre, commenter la conception et rédiger les messages de commit en français.
- Le code (identifiants, noms de classes, de fichiers) reste en anglais, comme dans le dépôt.
- Respecter le style du code voisin : densité de commentaires, nommage, idiomes. Pas de refactoring hors du périmètre demandé.

## Git
- Branche d'intégration : `develop`. Ne jamais committer sur `develop`, `main` ni `master` : travailler sur une branche dédiée.
- Messages de commit : `type() : description` (ex. `chore() : met à jour la configuration`).
- Ne jamais pousser, créer de MR, force-push ni fusionner sans accord explicite de l'utilisateur. Les MR sont créées en brouillon.

## Limites : demander avant d'agir
- Suppression ou écrasement de fichiers non triviaux, changement de version de dépendance majeure, modification de la CI.
- Toute action sortante : push, MR, publication, appel à un service distant en écriture, déploiement.
- Ne jamais écrire de secret (token, mot de passe, clé) dans le code, la configuration, les logs ou un commit.

## Outils Vibe disponibles
- `/code-review` : revue du `git diff` local avant de proposer un commit.
- `vibe --agent reviewer` : relecteur générique en lecture seule.
- `/tech-design <components.md>` : conception technique avec impact multi-composants, quand un changement touche plusieurs composants.

## Définition de « terminé »
- Le build et les tests passent localement (commandes ci-dessous ou dans la section du type de composant).
- Le diff ne contient que ce qui a été demandé : pas de fichier généré, de log ni de secret.
- Une revue a été faite (`/code-review`) et ses constats bloquants sont traités ou signalés.
- Les points non vérifiés (comportement à l'exécution, environnement distant) sont dits explicitement, pas supposés.

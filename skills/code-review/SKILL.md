---
name: code-review
description: Revoit le git diff courant pour y trouver des bugs, des régressions et des tests manquants. À utiliser quand l'utilisateur demande une revue de ses changements.
user-invocable: true
allowed-tools: bash read_file grep
---

# Revue de code

1. Exécuter `git diff` (et `git diff --staged`) pour voir les changements.
2. Lire le code environnant de chaque fichier modifié quand le contexte l'exige.
3. Signaler les constats par ordre de sévérité : bugs de correction, régressions, sécurité, tests manquants, puis style.
4. Pour chaque constat, donner `file:line`, le problème et un correctif concret. Ignorer les détails mineurs s'il y a de vrais bugs.

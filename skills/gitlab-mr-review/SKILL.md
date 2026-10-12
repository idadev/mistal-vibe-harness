---
name: gitlab-mr-review
description: Revoit une merge request GitLab d'un projet Spring Boot et publie éventuellement les constats comme commentaires de MR. Usage - /gitlab-mr-review <numéro ou URL de MR>.
user-invocable: true
disable-model-invocation: true
---

# Revue de MR GitLab

Entrée : un numéro ou une URL de MR (si seul un numéro est donné, le projet est le remote GitLab du dépôt courant).

## 1. Récupérer la MR
Privilégier les outils GitLab MCP s'ils sont disponibles dans cette session (chercher les outils du serveur gitlab : get merge request, get merge request diffs/changes, list discussions). Sinon, se rabattre sur la CLI :
- `glab mr view <id>` et `glab mr diff <id>`
Si aucun des deux ne fonctionne, le dire et demander le diff à l'utilisateur ; ne pas deviner.

Collecter : titre, description, branches source/cible, fichiers modifiés avec leurs diffs, discussions existantes (ne pas répéter les commentaires déjà faits).

## 2. Obtenir le code en local
Si l'arbre de travail n'est pas sur la branche de la MR, ne pas changer de branche sans demander. Utiliser `git fetch` et lire les fichiers depuis la ref de la MR quand il faut plus de contexte que le diff.

## 3. Revue
Déléguer au sous-agent `reviewer-spring` avec l'outil `task`. Lui transmettre le titre de la MR, la description, le diff et la liste des discussions existantes. Il renvoie des constats sous la forme `[severity] path:LINE - problem - fix` plus un verdict.

## 4. Rapport
Montrer à l'utilisateur les constats groupés par sévérité et le verdict. Écarter tout constat qu'on ne peut pas rattacher à une ligne modifiée.

Demander ensuite à l'utilisateur : « Voulez-vous que la revue soit enregistrée dans un fichier Markdown ? » Si oui, l'écrire (chemin par défaut `reviews/mr-<id>-review.md` dans le projet courant, sauf si l'utilisateur en donne un autre) avec : titre et lien de la MR, verdict, constats groupés par sévérité avec `file:line`, problème et correctif. Ne pas créer le fichier sans un oui.

## 5. Publication
Toujours demander à l'utilisateur : « Voulez-vous que je publie ces commentaires sur la MR ? » Ne rien faire sur GitLab sauf si la réponse est oui. La question est posée ici, par la session principale : le sous-agent `reviewer-spring` ne peut pas interagir avec l'utilisateur et ne publie jamais.

Si confirmé, publier une discussion en ligne par constat sur la ligne de diff correspondante (outil MCP create-thread/discussion, ou `glab mr note <id> -m "..."` pour un commentaire général), puis un commentaire de synthèse avec le verdict. Ne jamais approuver ni fusionner la MR.

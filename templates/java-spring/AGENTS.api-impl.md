
## Composant d'implémentation d'API

<!-- Hypothèses par défaut : contract-first, le contrat vient d'un composant API séparé consommé comme dépendance Maven. -->

Ce composant implémente un contrat OpenAPI défini ailleurs. Il ne définit pas l'API : il la réalise.

### Contrat consommé
- Dépendance Maven du contrat : <!-- À COMPLÉTER : groupId:artifactId:version -->
- Les interfaces (`*Api`) et DTO sont **générés** : les implémenter, ne jamais les modifier ni les copier.
- Si le contrat doit changer, ne pas contourner : le modifier dans le composant API, puis mettre à jour la version ici.

### Structure
- `controller` : implémente l'interface générée, délègue au service, aucune logique métier.
- `service` : logique métier et transactions. `repository` : accès aux données.
- `mapper` : conversion DTO ↔ entité (MapStruct ou équivalent déjà utilisé dans le dépôt).

### Règles
- Valider les entrées (`@Valid`, contraintes du contrat) ; ne jamais faire confiance à l'appelant.
- Erreurs : gestion centralisée (`@RestControllerAdvice`, `ProblemDetail`), codes de statut conformes au contrat, aucune stack trace ni message interne dans les réponses.
- Respecter le comportement documenté par le contrat (codes de statut, schémas d'erreur, pagination). Tout écart est un bug ou un changement de contrat à discuter.
- Sécurité : chaque endpoint est couvert par la configuration de sécurité ; autorisations vérifiées au niveau service ou méthode quand nécessaire.
- Logs : pas de donnée personnelle ni de secret ; inclure un identifiant de corrélation s'il existe dans le dépôt.

### Tests
- Tests de contrôleur (`@WebMvcTest`) pour les codes de statut et la validation.
- Tests de conformité au contrat : <!-- À COMPLÉTER : outil utilisé, ex. validation des réponses contre le YAML -->.
- Tests de service sur la logique métier, avec des dépendances simulées.

### Avant de terminer
- `./mvnw verify` est vert avec la version du contrat déclarée.
- Aucun endpoint ajouté qui ne soit pas dans le contrat.
- `vibe --agent reviewer-spring` n'a pas de constat bloquant.

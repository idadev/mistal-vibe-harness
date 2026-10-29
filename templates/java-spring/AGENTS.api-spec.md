
## Composant API pure (contrat OpenAPI)

<!-- Hypothèses par défaut : approche contract-first, génération avec openapi-generator-maven-plugin, aucun code métier dans ce composant. -->

Ce composant porte uniquement le **contrat** d'une API. Il est la source de vérité : les implémentations en dépendent, pas l'inverse.

### Structure
- Contrat : `src/main/resources/openapi/<nom>.yaml` <!-- À COMPLÉTER : chemin réel -->
- Interfaces et DTO générés par `openapi-generator-maven-plugin` dans `target/generated-sources/`.
- **Ne jamais éditer les sources générées** ni les committer. Changer le contrat, puis régénérer.

### Commandes
| Action | Commande |
|---|---|
| Régénérer et compiler | `./mvnw clean verify` |
| Lint du contrat | <!-- À COMPLÉTER : ex. `npx @stoplight/spectral-cli lint src/main/resources/openapi/*.yaml` --> |

### Règles sur le contrat
- Toute modification passe par le fichier OpenAPI, jamais par le code généré.
- **Compatibilité** : sont interdits sans nouvelle version majeure du contrat : suppression ou renommage d'un champ, d'un endpoint ou d'un paramètre ; ajout d'un champ requis ; resserrement d'un type, d'un enum ou d'une contrainte ; changement d'un code de statut.
- Sont compatibles : ajout d'un endpoint, d'un champ optionnel, d'une valeur d'enum côté réponse (à signaler comme risque pour les consommateurs stricts).
- Chaque modification de contrat s'accompagne d'une montée de version (`info.version`) cohérente avec son impact (semver).
- Toujours renseigner : `operationId` unique et stable, `summary`, schémas réutilisables dans `components/schemas`, exemples, codes d'erreur (`4xx`/`5xx`) avec un schéma d'erreur commun.
- Pagination, tri, filtrage et format des erreurs : suivre les conventions déjà présentes dans le contrat. <!-- À COMPLÉTER : conventions maison -->
- Aucune logique métier, aucune dépendance applicative : uniquement le contrat et la génération.

### Avant de terminer
- Le contrat est valide (build vert, lint sans erreur).
- Le changement est classé : compatible / cassant. S'il est cassant, le dire explicitement et lister les composants consommateurs à adapter (`/tech-design` si plusieurs).

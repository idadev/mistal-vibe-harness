
## Java / Spring Boot (commun)

<!-- Hypothèses par défaut : Maven, Java 25, Spring Boot 4.x. Corriger si le composant diffère. -->

### Stack
- Java : 25. Spring Boot : 4.x. Build : Maven (utiliser `./mvnw` s'il existe, sinon `mvn`).
- Ne jamais modifier la version de Java ou de Spring Boot hors d'une tâche de migration explicite (voir les skills `java-migration` et `spring-boot-migration`).

### Commandes
| Action | Commande |
|---|---|
| Compiler et tester | `./mvnw verify` |
| Tests unitaires seuls | `./mvnw test` |
| Un test précis | `./mvnw test -Dtest=NomDeClasseTest` |
| Build sans tests (à éviter pour valider) | `./mvnw -DskipTests package` |

### Architecture
- Couches : `controller` → `service` → `repository`. Pas de logique métier dans les contrôleurs, pas d'accès repository depuis les contrôleurs.
- Injection par constructeur uniquement (pas de `@Autowired` sur champ). Beans sans état.
- `@Transactional` sur la couche service, pas dans les contrôleurs. Pas d'appel distant (HTTP, messagerie) dans une longue transaction.
- Ne pas exposer d'entités JPA dans les réponses : passer par des DTO.

### Configuration et profils
- Configuration dans `application.yml` ; surcharges par profil (`application-<profil>.yml`). Aucun secret en clair : variables d'environnement ou secret store.
- Ne pas ajouter de propriété sans la documenter (commentaire ou `additional-spring-configuration-metadata`).

### Tests
- JUnit 5 + AssertJ. Un test par comportement, nommé selon ce qu'il vérifie.
- Tests de slice (`@WebMvcTest`, `@DataJpaTest`) avant `@SpringBootTest` quand c'est suffisant.
- Un bug corrigé s'accompagne d'un test qui échouait avant le correctif.

### Revue
- Avant de proposer un commit : `/code-review`, ou `vibe --agent reviewer-spring` (checklist `spring-boot-review-rules` : transactions, JPA, sécurité, validation, erreurs).

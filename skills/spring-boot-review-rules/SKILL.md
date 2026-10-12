---
name: spring-boot-review-rules
description: Checklist de revue pour le code Spring Boot (transactions, injection, JPA, sécurité, validation, erreurs, tests). À charger lors de la revue de changements Spring Boot.
user-invocable: false
---

# Checklist de revue Spring Boot

Vérifier chaque point uniquement par rapport au code modifié et à ce qu'il touche.

**Architecture et injection**
- Injection par constructeur, pas de `@Autowired` sur les champs. Pas de logique métier dans les contrôleurs ; pas d'accès aux repositories depuis les contrôleurs.
- Les beans sont sans état (pas de champs mutables dans les singletons). Pas de dépendances circulaires.

**Transactions**
- `@Transactional` sur la couche service, pas sur les contrôleurs. L'auto-invocation et les méthodes `private`/`final` contournent le proxy.
- Règles de rollback : les exceptions vérifiées ne déclenchent pas de rollback par défaut. `readOnly = true` pour les lectures pures.
- Pas d'appels distants (HTTP, messagerie) dans une longue transaction.

**JPA / données**
- Requêtes N+1 (associations lazy dans des boucles, `JOIN FETCH` / entity graph manquant). `findAll` non borné, pagination manquante.
- Entités non exposées directement dans les réponses d'API. `equals`/`hashCode`/`toString` sûrs sur les entités (pas de parcours lazy).
- Les changements de schéma s'accompagnent d'une migration (Flyway/Liquibase) rétrocompatible.

**API et validation**
- `@Valid` sur les corps de requête, contraintes sur les DTO, codes de statut HTTP corrects.
- Gestion d'erreurs centralisée (`@ControllerAdvice`), pas de stack traces ni de messages internes divulgués.

**Sécurité**
- Endpoints couverts par la configuration de sécurité, sécurité au niveau méthode si nécessaire. Pas de secrets ni d'identifiants dans le code, la configuration ou les logs.
- Les entrées utilisées dans les requêtes sont paramétrées. Pas de données sensibles dans les logs. Les changements CORS/CSRF sont intentionnels.

**Configuration**
- `@ConfigurationProperties` plutôt que des `@Value` dispersés. Profils et valeurs par défaut sûrs pour la production. Nouvelles propriétés documentées.

**Concurrence et ressources**
- `@Async`/jobs planifiés : pool de threads, gestion des erreurs, idempotence. Ressources fermées, timeouts définis sur les clients HTTP.

**Tests**
- Le nouveau comportement a des tests au bon niveau (`@WebMvcTest`, `@DataJpaTest`, tests par tranche plutôt que `@SpringBootTest` complet quand c'est possible). Assertions pertinentes, pas de sleeps, pas de dépendance à l'ordre des tests.


## Composant BDD (DDL / DML + entités)

<!-- Hypothèses par défaut : migrations Flyway, entités JPA. Moteur : à renseigner. -->

- Moteur : <!-- À COMPLÉTER : PostgreSQL / Oracle / autre, et version -->
- Outil de migration : Flyway. Scripts dans `src/main/resources/db/migration/` <!-- À COMPLÉTER si différent -->

### Migrations (DDL / DML)
- **Une migration appliquée n'est jamais modifiée** (même corrigée, même « juste un commentaire ») : en créer une nouvelle. Sinon la somme de contrôle Flyway échoue sur les environnements déjà migrés.
- Nommage : `V<version>__<description_en_snake_case>.sql`. Respecter la numérotation existante, sans trou ni doublon ; vérifier les branches parallèles avant de choisir un numéro.
- Séparer DDL (structure) et DML (données) dans des migrations distinctes. Les données de référence versionnées vont en migration `V`, les données répétables en `R__`.
- Toujours nommer explicitement contraintes, clés et index (`pk_`, `fk_`, `uk_`, `idx_` + table + colonnes) pour pouvoir les modifier plus tard.
- Rétrocompatibilité : l'ancienne version de l'application doit encore fonctionner pendant le déploiement. Pour supprimer ou renommer : déploiement en plusieurs temps (ajouter → migrer les données et le code → supprimer dans une migration ultérieure). Ajout de colonne `NOT NULL` : fournir une valeur par défaut ou procéder en deux étapes.
- Chaque migration risquée (verrou long, gros volume, suppression) est signalée, avec son plan de retour arrière (Flyway Community n'a pas d'`undo` : décrire le script inverse).
- **Aucun DML modifiant des données de production n'est écrit ou exécuté sans validation explicite de l'utilisateur.** Ne jamais exécuter de script contre une base partagée ou distante : produire le script, demander.

### Entités JPA
- L'entité reflète le schéma réel : tout changement d'entité (colonne, type, relation, contrainte) a sa migration, et inversement.
- `spring.jpa.hibernate.ddl-auto` doit rester à `validate` ou `none` : ne jamais laisser Hibernate générer ou modifier le schéma.
- Relations `@ManyToOne` / `@OneToMany` en `LAZY` ; éviter `EAGER`. Surveiller les N+1 (`JOIN FETCH`, entity graph).
- `equals`/`hashCode`/`toString` sûrs : pas de parcours d'associations lazy, pas de dépendance à un id nul avant persistance.
- Types : `Instant`/`OffsetDateTime` pour les dates, `BigDecimal` pour les montants, jamais `double`.

### Tests
- Tests de migration : démarrage sur base vide avec Testcontainers (même moteur qu'en production), toutes les migrations s'appliquent.
- `@DataJpaTest` contre le vrai moteur (Testcontainers) plutôt qu'une base en mémoire de moteur différent.

### Commandes
| Action | Commande |
|---|---|
| Tests (migrations incluses) | `./mvnw verify` |
| Statut des migrations | <!-- À COMPLÉTER : ex. `./mvnw flyway:info -Dflyway.url=...` (jamais sur un environnement partagé sans accord) --> |

### Avant de terminer
- Les migrations s'appliquent de zéro et sur une base à l'état précédent.
- Aucune migration existante modifiée (`git diff` ne montre que des ajouts dans `db/migration/`).
- Entités et schéma cohérents, aucun script ne cible un environnement réel.

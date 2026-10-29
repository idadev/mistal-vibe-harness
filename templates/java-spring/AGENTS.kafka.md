
## Composant consumer / producer Kafka

<!-- Hypothèses par défaut : Spring Kafka, messages JSON avec un schéma JSON Schema versionné, tests avec Testcontainers (ou EmbeddedKafka). Adapter si Avro ou un schema registry est utilisé. -->

### Topics et messages
- Topics produits : <!-- À COMPLÉTER : nom, clé, schéma -->
- Topics consommés : <!-- À COMPLÉTER : nom, group id, schéma -->
- Le schéma d'un message est un **contrat** partagé avec d'autres équipes : le traiter comme un contrat d'API (voir compatibilité ci-dessous).
- La clé de message détermine l'ordre au sein d'une partition : ne pas la changer sans analyse d'impact.

### Règles de compatibilité des messages
- Sont compatibles : ajout d'un champ optionnel.
- Sont cassants : suppression ou renommage d'un champ, ajout d'un champ requis, changement de type ou de sémantique, changement de clé ou de nom de topic. Un changement cassant demande une nouvelle version du schéma/du topic et une migration coordonnée des consommateurs (`/tech-design`).
- Un consumer doit tolérer les champs inconnus.

### Consumer
- **Idempotence** : un message peut être livré plusieurs fois. Le traitement doit donner le même résultat (clé métier, déduplication, upsert).
- Offsets : ne committer qu'après traitement réussi ; ne pas committer d'offset avant la fin du traitement.
- Erreurs : distinguer erreurs transitoires (retry avec backoff) et erreurs définitives (envoi en DLT, avec cause et message d'origine). Aucun message ne doit être perdu silencieusement.
- Pas de traitement long dans le thread de poll (risque de rebalance) ; configurer `max.poll.interval.ms` et `max.poll.records` en conséquence.
- Ne pas bloquer sur un message empoisonné : prévoir la gestion des erreurs de désérialisation (`ErrorHandlingDeserializer`).

### Producer
- Configuration explicite : `acks=all`, idempotence activée, `retries`/`delivery.timeout.ms` cohérents.
- Publier après le commit de la transaction métier, ou via un outbox si la cohérence BDD ↔ Kafka est exigée. Ne pas publier dans une transaction susceptible d'être annulée.
- Gérer le résultat de l'envoi (callback / future) : logguer et traiter l'échec.

### Tests
- Tests d'intégration avec Testcontainers Kafka (ou `@EmbeddedKafka` si déjà utilisé).
- Couvrir : message nominal, doublon, message invalide, échec transitoire puis succès, envoi en DLT.
- Tester la sérialisation/désérialisation contre le schéma versionné.

### Commandes
| Action | Commande |
|---|---|
| Tests (dont intégration) | `./mvnw verify` |

### Avant de terminer
- Le changement de schéma est classé compatible / cassant, et les consommateurs ou producteurs concernés sont listés.
- Aucun nom de topic, group id ou secret de connexion en dur : configuration externalisée.

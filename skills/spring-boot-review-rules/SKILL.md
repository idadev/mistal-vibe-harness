---
name: spring-boot-review-rules
description: Review checklist for Spring Boot code (transactions, injection, JPA, security, validation, errors, tests). Load when reviewing Spring Boot changes.
user-invocable: false
---

# Spring Boot review checklist

Check each point only against the changed code and what it touches.

**Architecture and injection**
- Constructor injection, no field `@Autowired`. No business logic in controllers; no repository access from controllers.
- Beans are stateless (no mutable fields in singletons). No circular dependencies.

**Transactions**
- `@Transactional` on the service layer, not controllers. Self-invocation and `private`/`final` methods bypass the proxy.
- Rollback rules: checked exceptions do not roll back by default. `readOnly = true` for pure reads.
- No remote calls (HTTP, messaging) inside a long transaction.

**JPA / data**
- N+1 queries (lazy associations in loops, missing `JOIN FETCH` / entity graph). Unbounded `findAll`, missing pagination.
- Entities not exposed directly in API responses. `equals`/`hashCode`/`toString` safe on entities (no lazy traversal).
- Schema changes come with a migration (Flyway/Liquibase) that is backward compatible.

**API and validation**
- `@Valid` on request bodies, constraints on DTOs, correct HTTP status codes.
- Centralized error handling (`@ControllerAdvice`), no stack traces or internal messages leaked.

**Security**
- Endpoints covered by the security config, method security where needed. No secrets or credentials in code, config or logs.
- Input used in queries is parameterized. No sensitive data in logs. CORS/CSRF changes are intentional.

**Configuration**
- `@ConfigurationProperties` over scattered `@Value`. Profiles and defaults safe for production. New properties documented.

**Concurrency and resources**
- `@Async`/scheduled jobs: thread pool, error handling, idempotency. Resources closed, timeouts set on HTTP clients.

**Tests**
- New behavior has tests at the right level (`@WebMvcTest`, `@DataJpaTest`, slice tests over full `@SpringBootTest` when possible). Assertions are meaningful, no sleeps, no reliance on test order.

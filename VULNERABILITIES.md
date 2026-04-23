# Vulnerability inventory

Inventory of intentional weaknesses in the testbed, grouped by category. File and
symbol references point at the location where the weakness is realised in source.
Behaviour is gated through the active security profile in
[`src/config/profiles.js`](src/config/profiles.js).

## A. GraphQL-specific

| # | Issue                              | Where                                                        |
| - | ---------------------------------- | ------------------------------------------------------------ |
| A1 | Introspection enabled              | `ApolloServer({ introspection })` in `src/server.js`         |
| A2 | GraphQL Playground enabled         | `playground` toggle in `src/server.js`                       |
| A3 | Debug mode and verbose errors      | `debug` and `formatError` in `src/server.js`                 |
| A4 | No query depth limit               | No depth-limit plugin registered                             |
| A5 | No query cost / complexity limit   | No cost-analysis plugin registered                           |
| A6 | No request rate limiting           | Apollo Server is not fronted by a rate-limiter               |
| A7 | Circular query DoS via `friends`   | `User.friends` resolver in `src/resolvers/relations.js`      |
| A8 | Excessive data exposure (User)     | `password`, `ssn`, `creditCard`, `salary` in schema          |
| A9 | Excessive data exposure (Patient)  | `ssn`, `insuranceNumber`, `medicalHistory` in schema         |
| A10 | BOLA / IDOR on `patient(id)`      | `Query.patient` in `src/resolvers/query.js`                  |
| A11 | BOLA / IDOR on `patientBySSN`     | `Query.patientBySSN` in `src/resolvers/query.js`             |
| A12 | Aliasing-based brute force        | No alias guard; demonstrated via `login` aliases             |
| A13 | Unrestricted batched operations   | Apollo Server accepts arbitrary mutation arrays              |

## B. Authentication and access control

| # | Issue                                   | Where                                                  |
| - | --------------------------------------- | ------------------------------------------------------ |
| B1 | Hard-coded JWT secret (`secret123`)     | `src/config/secrets.js`                                |
| B2 | JWT signed without expiry by default    | `signToken` in `src/auth/jwt.js`                       |
| B3 | Invalid tokens silently downgraded      | `buildContext` in `src/auth/context.js`                |
| B4 | Username enumeration on login           | `Mutation.login` in `src/resolvers/mutation.js`        |
| B5 | Weak password policy                    | `Mutation.register` (`weakPasswordPolicy`)             |
| B6 | No brute-force protection (LAB profile) | `enforceLoginRateLimit` in `src/utils/ratelimit.js`    |
| B7 | Privilege escalation via fixed secret   | `Mutation.promoteToAdmin` (`ADMIN_SECRET_KEY`)         |
| B8 | Mass assignment on `updateUser`         | `Mutation.updateUser` (`allowMassAssignment`)          |
| B9 | Mass assignment on `updatePatient`      | `Mutation.updatePatient` (`allowMassAssignment`)       |

## C. Injection

| # | Issue                                  | Where                                                   |
| - | -------------------------------------- | ------------------------------------------------------- |
| C1 | SQLi-style filter bypass               | `search` in `src/services/search.js`                    |
| C2 | Command injection in `ping`            | `Query.ping` in `src/resolvers/query.js`                |
| C3 | Command injection in `systemDiagnostics` and `executeDebugCommand` | `Query.systemDiagnostics`, `Mutation.executeDebugCommand` |
| C4 | Path traversal on `readFile` / `listDirectory` | `src/services/filesystem.js`                    |
| C5 | Arbitrary file upload                  | `Mutation.uploadFile` in `src/resolvers/mutation.js`    |
| C6 | Stored XSS in patient comments and user bios | `addComment`, `updateBio`, medical record `data` |

## D. Information disclosure

| # | Issue                                | Where                                              |
| - | ------------------------------------ | -------------------------------------------------- |
| D1 | `systemInfo` leaks env and platform  | `Query.systemInfo` in `src/resolvers/query.js`     |
| D2 | `debugInfo` dumps the whole store    | `Query.debugInfo` in `src/resolvers/query.js`      |
| D3 | `serverConfig` exposes runtime config| `Query.serverConfig` in `src/resolvers/query.js`   |
| D4 | Verbose error stack traces           | `formatError` in `src/server.js`                   |
| D5 | `securityProfile` reveals toggles    | `Query.securityProfile`                            |

## E. Configuration and integration

| # | Issue                            | Where                                                |
| - | -------------------------------- | ---------------------------------------------------- |
| E1 | SSRF in `fetchExternalData`      | `Query.fetchExternalData`                            |
| E2 | SSRF in webhooks                 | `setWebhook`, `triggerWebhook`                       |
| E3 | Command injection in backups     | `backupDatabase`, `restoreDatabase`                  |
| E4 | CSRF-friendly state mutations    | `transferBalance`, no anti-CSRF guard                |

## Mitigation strategy

Each weakness can be removed at runtime by setting `TEST_MODE=BASELINE_HARDENED`.
Mitigation in code is discussed in the thesis; relevant patterns are:

- Query depth and cost analysis (`graphql-depth-limit`, `graphql-cost-analysis`)
- Persistent queries / allow-list
- Field-level authorisation through schema directives
- Strong JWT configuration (asymmetric keys, short-lived tokens, audience/issuer)
- Input validation and parameterised queries / prepared statements
- Rate limiting and brute-force protection
- Egress control for outbound requests (SSRF protection)
- Output encoding for stored content (XSS mitigation)
- Generic, redacted error responses in production

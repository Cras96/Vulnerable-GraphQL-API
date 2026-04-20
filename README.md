# Vulnerable GraphQL API

Healthcare management GraphQL API used as a security testbed for a master's thesis on
GraphQL API security at the University of the Aegean.

The server intentionally exposes a range of common GraphQL and web-application
weaknesses (introspection, BOLA/IDOR, mass assignment, command and SQL injection,
SSRF, path traversal, weak JWT, verbose errors, and so on) so that exploits can be
demonstrated and mitigations evaluated against the same baseline.

> The application is **not** intended to be deployed publicly. It runs locally and
> uses an in-memory store with synthetic data only.

## Requirements

- Node.js >= 18
- npm

## Setup

```bash
npm install
cp .env.example .env   # optional, defaults are fine
npm start
```

The server listens on `http://localhost:4000/graphql` by default.

## Security profiles

The behaviour of the server is driven by the `TEST_MODE` environment variable, which
selects one of three profiles defined in [`src/config/profiles.js`](src/config/profiles.js):

| Profile                | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `LAB_FULLY_VULNERABLE` | All weaknesses are reachable. Used for guided exploitation labs.|
| `PENTEST_REALISTIC`    | Production-like, with common misconfigurations left in place.   |
| `BASELINE_HARDENED`    | Dangerous features disabled. Used as a comparison baseline.     |

`PENTEST_REALISTIC` is the default. To launch the lab profile:

```bash
npm run lab
```

The active profile and per-feature toggles can be inspected at runtime with the
`securityProfile` query.

## Default credentials

| Username       | Password    | Role    |
| -------------- | ----------- | ------- |
| `admin`        | `admin123`  | ADMIN   |
| `drsmith`      | `doctor123` | DOCTOR  |
| `nurse_jane`   | `nurse123`  | NURSE   |
| `patient_john` | `patient123`| PATIENT |

## Project layout

```
src/
├── server.js           Apollo Server bootstrap
├── config/             Security profiles and hard-coded secrets
├── db/                 In-memory store and seed data
├── schema/             GraphQL type definitions
├── resolvers/          Query, Mutation and relation resolvers
├── auth/               JWT signing, request context, role guards
├── services/           Search, filesystem, shell and HTTP helpers
├── telemetry/          Assessment event recording and pattern detection
└── utils/              Sanitisation and rate limiting
```

## Assessment helpers

When the server detects a recognisable attack pattern (SQLi heuristics, command
injection, path traversal, SSRF to private hosts, stored XSS payloads, privilege
escalation, etc.) it records an entry in an in-memory event log. Admins can read
this back through:

```graphql
query {
  assessmentSummary { totalEvents criticalEvents highEvents mediumEvents lowEvents }
  assessmentEvents(limit: 25) { timestamp category vector severity payload actor }
}
```

To wipe the log and reset the in-memory data set:

```graphql
mutation {
  resetTestData(confirmPhrase: "reset-test-data-confirmed")
}
```

## Documentation

- [`VULNERABILITIES.md`](VULNERABILITIES.md) - inventory of intentional weaknesses, grouped by category.
- [`PAYLOADS.graphql`](PAYLOADS.graphql) - example queries and mutations that exercise each weakness.

## Disclaimer

This repository exists for academic research and security education. Running it on
any host that is reachable from a public network is not supported.

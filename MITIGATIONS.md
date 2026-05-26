# Mitigations

For every weakness listed in [`VULNERABILITIES.md`](VULNERABILITIES.md) this
file shows the production-grade fix and the configuration knob in
[`src/config/profiles.js`](src/config/profiles.js) that already encodes it for
the `BASELINE_HARDENED` profile.

The snippets are intentionally short. They show the pattern, not the entire
implementation; the thesis chapter expands on each.

---

## A. GraphQL-specific

### A1. Introspection enabled
Disable introspection outside development.

```js
// src/server.js
new ApolloServer({
  introspection: process.env.NODE_ENV !== 'production'
})
```
Profile knob: `introspectionEnabled: false`.

### A2. Playground enabled
Same fix as A1. Apollo Server 3 ships the playground only when
`playground: true`. Apollo Server 4 removes it entirely.

```js
new ApolloServer({ playground: false })
```
Profile knob: `playgroundEnabled: false`.

### A3. Debug mode and verbose errors
Return generic errors in production. Never return stack traces or
`originalError` strings to clients.

```js
formatError: (error) => ({
  message: 'Internal error',
  path: error.path
})
```
Profile knob: `debugEnabled: false`, `verboseErrors: false`.

### A4. No query depth limit
Use `graphql-depth-limit` as a validation rule.

```js
const depthLimit = require('graphql-depth-limit');
new ApolloServer({ validationRules: [depthLimit(7)] })
```

### A5. No cost / complexity analysis
Use `graphql-cost-analysis` or `graphql-query-complexity` and reject queries
above a budget.

```js
const costAnalysis = require('graphql-cost-analysis').default;
new ApolloServer({
  validationRules: [costAnalysis({ maximumCost: 1000 })]
})
```

### A6. No request rate limiting
Front Apollo with `express-rate-limit` (or use Apollo's plugin API).

```js
const rateLimit = require('express-rate-limit');
app.use('/graphql', rateLimit({ windowMs: 60_000, max: 60 }));
```

### A7. Circular query DoS via `User.friends`
Either remove the recursive field or require pagination + auth, and rely on
the depth limit from A4.

```graphql
type User {
  friends(first: Int!, after: String): UserConnection!
}
```

### A8. Excessive data exposure on `User`
Remove sensitive fields from the schema; expose them through dedicated
admin-only queries with field-level authorisation.

```graphql
type User { id: ID!; username: String!; email: String!; role: Role! }
type AdminUserView @auth(role: "ADMIN") { ssn: String; salary: Float }
```
Profile knob: `hideSensitiveFields: true`.

### A9. Excessive data exposure on `Patient`
Same pattern as A8. Limit `ssn`, `insuranceNumber`, `medicalHistory` to roles
with a legitimate need.

### A10. BOLA / IDOR on `patient(id)`
Resolve the caller's identity and verify ownership or care relationship.

```js
patient: (_, { id }, ctx) => {
  const user = requireAuth(ctx);
  const patient = store.patients.find(p => p.id === id);
  if (!canAccessPatient(user, patient)) throw new ForbiddenError();
  return patient;
}
```
Profile knob: `enforceRoleChecks: true`.

### A11. BOLA / IDOR on `patientBySSN`
Restrict to admin roles and audit every lookup.

```js
patientBySSN: (_, { ssn }, ctx) => {
  requireRole(ctx, ['ADMIN']);
  audit.record({ actor: ctx.user.id, action: 'lookup_by_ssn', ssn });
  return store.patients.find(p => p.ssn === ssn);
}
```

### A12. Aliasing-based brute force
Limit aliases per operation and rate-limit by IP + username on `login`.

```js
const noAliases = require('graphql-no-alias').default;
new ApolloServer({ validationRules: [noAliases({ login: 1 })] })
```
Profile knob: `rateLimitLogin: true`.

### A13. Unrestricted batched operations
Cap operations per request or disable HTTP batching.

```js
new ApolloServer({ allowBatchedHttpRequests: false })
```

---

## B. Authentication and access control

### B1. Hard-coded JWT secret
Load the secret from the environment; fail to start if unset. Use 32+ random
bytes, or move to asymmetric keys (RS256 / EdDSA).

```js
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) throw new Error('JWT_SECRET missing');
```

### B2. JWT signed without expiry
Always set `expiresIn` and validate `aud` / `iss`.

```js
jwt.sign(payload, JWT_SECRET, { expiresIn: '15m', issuer: 'hospital', audience: 'hospital-clients' });
```
Profile knob: `tokenExpiresIn: '15m'`.

### B3. Invalid tokens silently downgraded
Reject the request when the token is present and invalid.

```js
if (token) {
  try { user = jwt.verify(token, secret); }
  catch { throw new AuthenticationError('Invalid or expired token'); }
}
```
Profile knob: `strictTokenValidation: true`.

### B4. Username enumeration on login
Return the same error string for unknown user and wrong password, and
add constant-time delay.

```js
const VALID = await bcrypt.compare(password, user?.password || PLACEHOLDER_HASH);
if (!user || !VALID) throw new Error('Invalid credentials');
```

### B5. Weak password policy
Enforce length and complexity on registration; use `zxcvbn` for scoring.

```js
if (password.length < 12 || zxcvbn(password).score < 3) {
  throw new Error('Password too weak');
}
```
Profile knob: `weakPasswordPolicy: false`.

### B6. No brute-force protection
Sliding-window rate limit per `(ip, username)` and exponential lockout.

```js
enforceLoginRateLimit(context, username); // throws after N attempts/minute
```
Profile knob: `rateLimitLogin: true`, `maxLoginAttemptsPerMinute: 5`.

### B7. Privilege escalation via fixed secret
Remove the shortcut. Promotion to ADMIN requires an existing admin session
plus an out-of-band second factor.

```js
promoteToAdmin: (_, { userId }, ctx) => {
  requireRole(ctx, ['ADMIN']);
  requireMfa(ctx);
  // ...
}
```

### B8. Mass assignment on `updateUser`
Allow-list the fields a caller can change.

```js
const ALLOWED = ['username', 'email', 'department'];
const patch = pick(updates, ALLOWED);
Object.assign(user, patch);
```
Profile knob: `allowMassAssignment: false`.

### B9. Mass assignment on `updatePatient`
Same allow-list approach as B8, scoped to fields the caller's role can edit.

---

## C. Injection

### C1. SQLi-style filter bypass
In a real database, use parameterised queries.

```js
const rows = await db.query('SELECT * FROM patients WHERE name ILIKE $1', [`%${query}%`]);
```

In the in-memory store, never short-circuit on suspicious payloads; treat
all input as untrusted data to filter against.

### C2 + C3. Command injection
Never pass user input to a shell. Use language-native APIs or a fixed
command with array arguments.

```js
const { execFile } = require('child_process');
execFile('ping', ['-n', '1', host], (err, out) => { /* ... */ });
```
Profile knob: `allowCommandExecution: false` removes the surface entirely.

### C4. Path traversal
Normalise and confine the resolved path to a known root.

```js
const root = path.resolve(__dirname, 'public');
const full = path.resolve(root, filename);
if (!full.startsWith(root + path.sep)) throw new Error('Forbidden path');
```
Profile knob: `allowDangerousReadOps: false`.

### C5. Arbitrary file upload
Restrict to an allow-list of extensions, store under a random name,
and never serve from the upload directory as code.

```js
const ext = path.extname(filename).toLowerCase();
if (!['.png', '.jpg', '.pdf'].includes(ext)) throw new Error('Unsupported type');
const safeName = `${uuidv4()}${ext}`;
```

### C6. Stored XSS
Sanitise on input (`DOMPurify` server-side) and encode on output. Set a
strict `Content-Security-Policy` on the consuming application.

```js
const clean = DOMPurify.sanitize(comment);
patient.medicalHistory += `\nComment: ${clean}`;
```

---

## D. Information disclosure

### D1 + D2 + D3. `systemInfo`, `debugInfo`, `serverConfig`
Remove from the schema in production, or gate behind an explicit
diagnostics role and never include `process.env` or the full data store.

### D4. Verbose error stack traces
See A3. In production, log the stack server-side; return a generic message
to the client.

### D5. `securityProfile` reveals toggles
Do not expose internal configuration through the public schema. Move
runtime introspection to a separate, network-restricted admin endpoint.

---

## E. Configuration and integration

### E1. SSRF in `fetchExternalData`
Allow-list destinations and resolve hostnames before fetching to block
private and link-local addresses.

```js
const url = new URL(input);
if (!ALLOWED_HOSTS.has(url.host)) throw new Error('Host not allowed');
const ip = (await dns.lookup(url.hostname)).address;
if (isPrivateIp(ip)) throw new Error('Private targets blocked');
```
Profile knob: `allowSSRF: false`.

### E2. SSRF in webhooks
Same allow-list and DNS-resolution checks as E1. Sign outbound payloads
and forbid redirects to private ranges.

### E3. Command injection in `backupDatabase` / `restoreDatabase`
Replace shell echoes with native filesystem APIs and use `execFile` for
external tools (see C2).

```js
fs.writeFileSync(destination, JSON.stringify(snapshot));
```

### E4. CSRF-friendly state-changing mutations
Require a CSRF token tied to the session, reject cross-origin requests,
and check role/ownership on every mutation.

```js
app.use(csurf());
new ApolloServer({
  context: ({ req }) => {
    if (req.method !== 'GET' && !req.headers['x-csrf-token']) {
      throw new Error('CSRF token missing');
    }
    return buildContext({ req });
  }
});
```

---

## Verifying mitigations with the testbed

Each fix above corresponds to a toggle in the `BASELINE_HARDENED` profile.
Running the same payload from [`PAYLOADS.graphql`](PAYLOADS.graphql) against
both profiles is the comparison harness:

```bash
TEST_MODE=LAB_FULLY_VULNERABLE npm start    # exploit succeeds
TEST_MODE=BASELINE_HARDENED   npm start    # exploit blocked
```

The expected behaviour for each profile is summarised in the runtime
`securityProfile` query.

const { test, describe, before } = require('node:test');
const assert = require('node:assert');
const { ApolloServer } = require('apollo-server');

process.env.TEST_MODE = 'LAB_FULLY_VULNERABLE';

const typeDefs = require('../src/schema/typeDefs');
const resolvers = require('../src/resolvers');
const { buildContext } = require('../src/auth/context');

let server;

before(() => {
  server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ req } = {}) => buildContext({ req: req || { headers: {} } })
  });
});

async function run(query, variables) {
  const result = await server.executeOperation({ query, variables });
  return result;
}

describe('schema sanity', () => {
  test('introspection returns Query type', async () => {
    const res = await run('{ __schema { queryType { name } } }');
    assert.strictEqual(res.data.__schema.queryType.name, 'Query');
  });
});

describe('users and patients', () => {
  test('users query returns seeded admin', async () => {
    const res = await run('{ users { id username role } }');
    assert.ok(Array.isArray(res.data.users));
    const admin = res.data.users.find(u => u.username === 'admin');
    assert.strictEqual(admin.role, 'ADMIN');
  });

  test('patient(id: 1) returns John Doe', async () => {
    const res = await run('{ patient(id: "1") { name ssn } }');
    assert.strictEqual(res.data.patient.name, 'John Doe');
    assert.strictEqual(res.data.patient.ssn, '111-22-3333');
  });
});

describe('intentional weaknesses', () => {
  test('searchPatients SQLi-style bypass returns full table', async () => {
    const res = await run('{ searchPatients(query: "\' OR \'1\'=\'1") { id } }');
    assert.strictEqual(res.data.searchPatients.length, 3);
  });

  test('promoteToAdmin succeeds with hard-coded secret', async () => {
    const res = await run(
      'mutation { promoteToAdmin(userId: "4", secretKey: "admin_key_12345") { id role } }'
    );
    assert.strictEqual(res.data.promoteToAdmin.role, 'ADMIN');
  });

  test('telemetry records the SQLi event', async () => {
    await run('{ searchPatients(query: "\' OR \'1\'=\'1") { id } }');
    const res = await run('{ assessmentSummary { criticalEvents } }');
    assert.ok(res.data.assessmentSummary.criticalEvents > 0);
  });
});

describe('auth flow', () => {
  test('login with valid credentials returns a token', async () => {
    const res = await run(
      'mutation { login(username: "admin", password: "admin123") { token } }'
    );
    assert.ok(typeof res.data.login.token === 'string');
    assert.ok(res.data.login.token.split('.').length === 3);
  });

  test('login with wrong password fails', async () => {
    const res = await run(
      'mutation { login(username: "admin", password: "nope") { token } }'
    );
    assert.ok(res.errors);
  });
});

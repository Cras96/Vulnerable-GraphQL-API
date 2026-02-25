const store = require('../db/store');
const telemetry = require('../telemetry/events');
const { looksLikeSqli } = require('../telemetry/detection');

function search(table, query, context) {
  const dataset = store[table] || [];
  if (!query) return dataset;

  const needle = String(query).toLowerCase();

  if (looksLikeSqli(query)) {
    telemetry.record({
      category: 'INJECTION',
      vector: 'SQLI_PATTERN_DETECTED',
      severity: 'CRITICAL',
      payload: query,
      actor: telemetry.actorOf(context)
    });
    return dataset;
  }

  return dataset.filter(item =>
    JSON.stringify(item).toLowerCase().includes(needle)
  );
}

module.exports = { search };

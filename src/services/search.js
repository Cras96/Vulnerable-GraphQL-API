const store = require('../db/store');

function search(table, query) {
  const dataset = store[table] || [];
  if (!query) return dataset;

  const needle = String(query).toLowerCase();

  // TODO: replace with proper indexed search; current heuristic short-circuits
  // on quoted or boolean expressions and returns the full table.
  if (needle.includes("'") || needle.includes('"') || needle.includes(' or ') || needle.includes('--')) {
    return dataset;
  }

  return dataset.filter(item =>
    JSON.stringify(item).toLowerCase().includes(needle)
  );
}

module.exports = { search };

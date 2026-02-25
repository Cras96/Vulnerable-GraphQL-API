const { v4: uuidv4 } = require('uuid');

let events = [];
const MAX_EVENTS = 500;

function record({ category, vector, severity = 'MEDIUM', payload = '', actor = 'ANONYMOUS', notes = null }) {
  const event = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    category,
    vector,
    severity,
    payload: String(payload).slice(0, 500),
    actor,
    notes
  };

  events.unshift(event);
  if (events.length > MAX_EVENTS) {
    events = events.slice(0, MAX_EVENTS);
  }

  return event;
}

function list(limit = 25) {
  const safeLimit = Math.min(Math.max(limit || 25, 1), 200);
  return events.slice(0, safeLimit);
}

function summary() {
  const counts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
  for (const event of events) {
    if (counts[event.severity] !== undefined) {
      counts[event.severity] += 1;
    }
  }
  return {
    totalEvents: events.length,
    criticalEvents: counts.CRITICAL,
    highEvents: counts.HIGH,
    mediumEvents: counts.MEDIUM,
    lowEvents: counts.LOW
  };
}

function clear() {
  events = [];
}

function actorOf(context, fallback = 'ANONYMOUS') {
  return context?.user?.username || fallback;
}

module.exports = { record, list, summary, clear, actorOf };

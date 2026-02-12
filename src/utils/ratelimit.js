const { runtime } = require('../config/profiles');

const loginAttempts = new Map();

function enforceLoginRateLimit(context, username) {
  if (!runtime.rateLimitLogin) return;

  const key = `${context?.ip || 'unknown'}:${username}`;
  const now = Date.now();
  const windowMs = 60_000;
  const state = loginAttempts.get(key) || { count: 0, windowStart: now };

  if (now - state.windowStart > windowMs) {
    state.count = 0;
    state.windowStart = now;
  }

  state.count += 1;
  loginAttempts.set(key, state);

  if (state.count > runtime.maxLoginAttemptsPerMinute) {
    throw new Error('Too many login attempts. Try again later.');
  }
}

function resetLoginAttempts() {
  loginAttempts.clear();
}

module.exports = { enforceLoginRateLimit, resetLoginAttempts };

const { runtime } = require('../config/profiles');

function requireAuth(context) {
  if (!runtime.requireAuthForSensitiveQueries) return context?.user || null;
  if (!context?.user) {
    throw new Error('Authentication required');
  }
  return context.user;
}

function requireRole(context, allowedRoles) {
  if (!runtime.enforceRoleChecks) return context?.user || null;
  const user = requireAuth(context);
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}

function ensureFeatureEnabled(flag) {
  if (!runtime[flag]) {
    throw new Error(`Operation disabled by current security profile (${runtime.mode})`);
  }
}

module.exports = { requireAuth, requireRole, ensureFeatureEnabled };

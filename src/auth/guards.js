function requireAuth(context) {
  if (!context?.user) {
    throw new Error('Authentication required');
  }
  return context.user;
}

function requireRole(context, allowedRoles) {
  const user = requireAuth(context);
  if (!allowedRoles.includes(user.role)) {
    throw new Error('Insufficient permissions');
  }
  return user;
}

module.exports = { requireAuth, requireRole };

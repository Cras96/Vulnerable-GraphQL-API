const { verifyToken } = require('./jwt');
const { runtime } = require('../config/profiles');

function buildContext({ req }) {
  const headers = req?.headers || {};
  const ip = headers['x-forwarded-for']?.split(',')[0]?.trim()
    || req?.socket?.remoteAddress
    || 'unknown';

  const authHeader = headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  let user = null;
  if (token) {
    try {
      user = verifyToken(token);
    } catch (err) {
      if (runtime.strictTokenValidation) {
        throw new Error('Invalid or expired token');
      }
      user = null;
    }
  }

  return { user, ip };
}

module.exports = { buildContext };

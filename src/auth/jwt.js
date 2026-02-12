const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/secrets');
const { runtime } = require('../config/profiles');

function signToken(user) {
  const options = {};
  if (runtime.tokenExpiresIn) {
    options.expiresIn = runtime.tokenExpiresIn;
  }
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    options
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };

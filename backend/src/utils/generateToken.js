const jwt = require('jsonwebtoken');

const generateToken = (userId) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '30d';

  return jwt.sign({ userId }, secret, { expiresIn });
};

module.exports = generateToken;

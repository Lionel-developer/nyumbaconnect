const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token) return next();

    const secret = process.env.JWT_SECRET;
    if (!secret) return next();

    const decoded = jwt.verify(token, secret);
    const user = await User.findById(decoded.userId);

    if (user && user.isActive !== false) {
      req.user = user;
    }

    return next();
  } catch (err) {
    return next();
  }
};

module.exports = optionalProtect;

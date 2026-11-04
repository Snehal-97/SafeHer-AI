const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 1. Try verifying with standard local HS256 secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    // 2. Admin fallback check if standard verification fails
    try {
      const adminDecoded = jwt.verify(token, process.env.ADMIN_SECRET_FALLBACK);
      if (adminDecoded && adminDecoded.isAdmin) {
        req.user = adminDecoded;
        return next();
      }
      throw new Error('Not an admin fallback token');
    } catch (fallbackErr) {
      return res.status(403).json({ error: 'Invalid or expired token.' });
    }
  }
};

module.exports = verifyToken;

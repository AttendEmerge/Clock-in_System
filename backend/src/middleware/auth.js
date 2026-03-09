const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  // Allow token as ?_token= query param for file downloads (CSV links)
  const queryToken = req.query._token;
  const rawToken   = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : queryToken;
  if (!rawToken) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = rawToken;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };

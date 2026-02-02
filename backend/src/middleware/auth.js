// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const env = require('../config/env'); // ya jo bhi aapka env file hai

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, env.jwtSecret || process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.debug('authenticateToken: token verify failed', err && err.message);
      return res.status(403).json({ success: false, error: 'Invalid or expired token' });
    }
    // Minimal info for debugging (do not log tokens)
    console.debug('authenticateToken: decoded user', { id: user.id, role: user.role });
    req.user = user;
    next();
  });
};

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    // Compare roles case-insensitively to avoid mismatches like 'Doctor' vs 'doctor'
    const userRole = String(req.user.role).toLowerCase();
    const allowed = Array.isArray(allowedRoles) ? allowedRoles.map(r => String(r).toLowerCase()) : [String(allowedRoles).toLowerCase()];
    console.debug('requireRole: check', { userRole, allowed });
    if (!allowed.includes(userRole)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
};

// ✅ SAHI EXPORT - Object mein dono functions
module.exports = {
  authenticateToken,
  requireRole
};
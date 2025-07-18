// auth-middleware.js - Middlewares de autenticación y autorización
const dbManager = require('./db-manager');

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
  if (req.session.usuario) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
}

// Middleware para verificar roles
function checkRole(roles) {
  return (req, res, next) => {
    if (req.session.usuario && roles.includes(req.session.usuario.ROL)) {
      next();
    } else {
      res.status(403).json({ error: 'Acceso prohibido' });
    }
  };
}

module.exports = {
  requireAuth,
  checkRole
};

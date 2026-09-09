const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Middleware para verificar el JWT y confirmar que el usuario sigue existiendo.
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token no proporcionado.' });
  if (!process.env.JWT_SECRET) return res.status(500).json({ error: 'JWT_SECRET no configurado en el servidor.' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { id: true, name: true, email: true, phone: true, address: true, role: true } });
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado.' });
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') return res.status(401).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' });
    return res.status(401).json({ error: 'Token inválido.' });
  }
};

const requireAdmin = (req, res, next) => req.user?.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Se requiere rol de administrador.' });
const requireClientOrAdmin = (req, res, next) => ['CLIENT', 'ADMIN'].includes(req.user?.role) ? next() : res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
const generateToken = (user) => jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

module.exports = { authenticateToken, requireAdmin, requireClientOrAdmin, generateToken };

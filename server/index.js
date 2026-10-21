require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin, requireClientOrAdmin, generateToken } = require('./middleware/auth');
const { isValidOrderTransition } = require('./domain/order-status');
const { parsePriceToAmount, csvCell } = require('./domain/money');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();
const uploadsDir = path.join(__dirname, '..', 'uploads');
const privateUploadsDir = path.join(__dirname, '..', 'private-uploads');
const isServerless = Boolean(process.env.VERCEL) || process.env.NODE_ENV === 'production';

// Vercel ejecuta las funciones en un sistema de archivos de solo lectura.
// La carpeta local se conserva para desarrollo, pero no debe crearse al
// inicializar la función en producción.
if (!isServerless) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  fs.mkdirSync(privateUploadsDir, { recursive: true });
}

const smtpPort = Number(process.env.SMTP_PORT) || 587;
const mailTransport = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({ host: process.env.SMTP_HOST, port: smtpPort, secure: smtpPort === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
  : null;

function sendEmail(to, subject, text) {
  if (!mailTransport || !to) return Promise.resolve(false);
  return mailTransport.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text })
    .then(() => true)
    .catch(error => { console.error('No se pudo enviar una notificación de BALAM por correo:', error.message); return false; });
}

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET no está definido. Configúralo antes de producción.');
}

app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    connectSrc: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    frameAncestors: ["'none'"]
  } },
  crossOriginEmbedderPolicy: false
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));
// El directorio de comprobantes está dentro del workspace, pero nunca se sirve como contenido estático.
app.use('/private-uploads', (_req, res) => res.sendStatus(404));
app.use(express.static(path.join(__dirname, '..')));

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedStatuses = ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED', 'DELIVERED'];
const allowedArtworkStatuses = ['AVAILABLE', 'SOLD', 'RESERVED'];
const allowedRoomTypes = ['PHOTO', 'GRADIENT'];
const allowedItemTypes = ['ARTWORK', 'BOOK'];
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false, skip: req => req.method === 'GET' || req.path === '/logout', message: { error: 'Demasiados intentos. Espera 15 minutos y vuelve a intentarlo.' } });
app.use('/api/auth', authLimiter);
const analyticsLimiter = rateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false });
let lastAnalyticsPruneAt = 0;

function setSessionCookie(res, token) {
  res.cookie('balam_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearSessionCookie(res) {
  res.clearCookie('balam_session', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/' });
}

function cleanString(value, max = 5000) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

function createSlug(value) {
  return cleanString(value, 80)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function validatePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) throw new Error('Las posiciones del hotspot deben estar entre 0 y 100.');
  return number;
}

function validatePriceAmount(value) {
  const amount = parsePriceToAmount(value);
  if (amount === null) throw new Error('El precio debe ser un monto entero válido, por ejemplo Q3,500.');
  return amount;
}

function validateRequired(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (!cleanString(value)) throw new Error(`${name} es requerido.`);
  }
}

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role };
}

function handlePrismaError(error, res, fallback = 'Error interno del servidor') {
  console.error(error);
  if (error?.code === 'P2002') return res.status(409).json({ error: 'Ya existe un registro con ese valor.' });
  if (error?.code === 'P2025') return res.status(404).json({ error: 'Registro no encontrado.' });
  return res.status(500).json({ error: fallback });
}

// Health check.
app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok', database: 'connected', message: 'BALAM API está funcionando' });
  } catch (error) {
    res.status(503).json({ status: 'error', database: 'disconnected', message: 'La API funciona, pero la base de datos no responde.' });
  }
});

// ========================= AUTENTICACIÓN =========================
app.post('/api/auth/login', async (req, res) => {
  try {
    const email = cleanString(req.body.email).toLowerCase();
    const password = String(req.body.password || '');
    if (!email || !password) return res.status(400).json({ error: 'Email y contraseña son requeridos.' });
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Formato de email inválido.' });
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ error: 'Credenciales inválidas.' });
    setSessionCookie(res, generateToken(user));
    res.json({ user: publicUser(user) });
  } catch (error) { handlePrismaError(error, res, 'Error al iniciar sesión.'); }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const name = cleanString(req.body.name, 120);
    const email = cleanString(req.body.email, 180).toLowerCase();
    const password = String(req.body.password || '');
    const phone = cleanString(req.body.phone, 40) || null;
    const address = cleanString(req.body.address, 300) || null;
    if (name.length < 2) return res.status(400).json({ error: 'El nombre debe tener al menos 2 caracteres.' });
    if (!emailRegex.test(email)) return res.status(400).json({ error: 'Formato de email inválido.' });
    if (password.length < 8) return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres.' });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'El email ya está registrado.' });
    const user = await prisma.user.create({ data: { name, email, password: await bcrypt.hash(password, 12), phone, address, role: 'CLIENT' } });
    setSessionCookie(res, generateToken(user));
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { handlePrismaError(error, res, 'Error al registrar usuario.'); }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => res.json({ valid: true, user: req.user }));
app.post('/api/auth/logout', (req, res) => { clearSessionCookie(res); res.json({ message: 'Sesión cerrada.' }); });

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const email = cleanString(req.body.email).toLowerCase();
    const generic = { message: 'Si el email existe, se ha generado un enlace de recuperación.' };
    if (!emailRegex.test(email)) return res.json(generic);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(generic);
    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { resetToken: crypto.createHash('sha256').update(resetToken).digest('hex'), resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) } });
    // En producción conecta este punto con Resend/SendGrid. Nunca envíes el token al cliente.
    if (process.env.NODE_ENV === 'development') return res.json({ ...generic, developmentToken: resetToken });
    return res.json(generic);
  } catch (error) { handlePrismaError(error, res, 'Error al solicitar recuperación.'); }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const token = cleanString(req.body.token, 200);
    const newPassword = String(req.body.newPassword || '');
    if (!token || newPassword.length < 8) return res.status(400).json({ error: 'Token y una contraseña de al menos 8 caracteres son requeridos.' });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const user = await prisma.user.findFirst({ where: { resetToken: tokenHash, resetTokenExpires: { gt: new Date() } } });
    if (!user) return res.status(400).json({ error: 'Token inválido o expirado.' });
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 12), resetToken: null, resetTokenExpires: null } });
    res.json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (error) { handlePrismaError(error, res, 'Error al restablecer contraseña.'); }
});

// ========================= UPLOADS =========================
app.post('/api/uploads/image', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (isServerless) {
      return res.status(501).json({ error: 'La carga de imágenes aún no está configurada para producción.' });
    }
    const dataUrl = cleanString(req.body.dataUrl, 8 * 1024 * 1024);
    const originalName = cleanString(req.body.fileName, 120);
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ error: 'Archivo de imagen inválido. Usa JPG, PNG, WEBP o GIF.' });
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }[match[1]];
    const safeBase = (path.basename(originalName, path.extname(originalName)).replace(/[^a-zA-Z0-9_-]/g, '-') || 'imagen').slice(0, 50);
    const fileName = `${Date.now()}-${crypto.randomBytes(5).toString('hex')}-${safeBase}${ext}`;
    fs.writeFileSync(path.join(uploadsDir, fileName), Buffer.from(match[2], 'base64'));
    res.status(201).json({ url: `/uploads/${fileName}`, fileName });
  } catch (error) { handlePrismaError(error, res, 'Error al subir imagen.'); }
});

// ========================= SALAS =========================
app.get('/api/rooms', async (req, res) => {
  try { res.json(await prisma.room.findMany({ include: { artworks: true }, orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] })); }
  catch (error) { handlePrismaError(error, res, 'Error al obtener salas.'); }
});

// Catálogo público con filtros y paginación para evitar cargar toda la colección a la vez.
app.get('/api/artworks', async (req, res) => {
  try {
    const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
    const pageSize = Math.max(1, Math.min(48, Number.parseInt(req.query.pageSize, 10) || 24));
    const q = cleanString(req.query.q, 120);
    const favoriteIds = cleanString(req.query.ids, 12000).split(',').filter(id => /^[a-zA-Z0-9_-]{1,80}$/.test(id)).slice(0, 200);
    const where = {
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { artist: { contains: q, mode: 'insensitive' } }] } : {}),
      ...(req.query.categoryId ? { categoryId: cleanString(req.query.categoryId, 80) } : {}),
      ...(allowedArtworkStatuses.includes(req.query.status) ? { status: req.query.status } : {}),
      ...(req.query.roomId ? { roomId: cleanString(req.query.roomId, 80) } : {})
    };
    if (req.query.ids !== undefined) where.id = { in: favoriteIds };
    const minPrice = req.query.minPrice === undefined ? undefined : Number(req.query.minPrice);
    const maxPrice = req.query.maxPrice === undefined ? undefined : Number(req.query.maxPrice);
    if ((minPrice !== undefined && (!Number.isFinite(minPrice) || minPrice < 0)) || (maxPrice !== undefined && (!Number.isFinite(maxPrice) || maxPrice < 0))) {
      return res.status(400).json({ error: 'El rango de precio no es válido.' });
    }
    if (minPrice !== undefined || maxPrice !== undefined) where.priceAmount = { ...(minPrice !== undefined ? { gte: minPrice } : {}), ...(maxPrice !== undefined ? { lte: maxPrice } : {}) };
    const sort = req.query.sort === 'price-asc' ? { priceAmount: 'asc' } : req.query.sort === 'price-desc' ? { priceAmount: 'desc' } : { createdAt: 'desc' };
    const [items, total] = await Promise.all([
      prisma.artwork.findMany({ where, include: { room: { select: { id: true, name: true, imageUrl: true } }, category: { select: { id: true, slug: true, name: true } } }, orderBy: sort, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.artwork.count({ where })
    ]);
    res.json({ items, page, pageSize, total, pages: Math.ceil(total / pageSize) });
  } catch (error) { handlePrismaError(error, res, 'Error al obtener el catálogo.'); }
});

// Métricas de uso sin guardar consultas, direcciones IP ni datos de cuenta.
app.post('/api/analytics', analyticsLimiter, async (req, res) => {
  try {
    const eventKey = cleanString(req.body.eventKey, 32);
    const visitorId = cleanString(req.body.visitorId, 64);
    const itemId = cleanString(req.body.itemId, 80) || null;
    if (!['SEARCH', 'ARTWORK_VIEW', 'ORDER_STARTED'].includes(eventKey)) return res.status(400).json({ error: 'Evento de analítica no válido.' });
    if (!/^[a-f0-9-]{16,64}$/i.test(visitorId)) return res.status(400).json({ error: 'Identificador de sesión no válido.' });
    if (itemId && !/^[a-zA-Z0-9_-]{1,80}$/.test(itemId)) return res.status(400).json({ error: 'Artículo no válido.' });
    await prisma.analyticsEvent.create({ data: { eventKey, visitorId, itemId } });
    if (Date.now() - lastAnalyticsPruneAt >= 24 * 60 * 60 * 1000) {
      lastAnalyticsPruneAt = Date.now();
      prisma.analyticsEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } }).catch(() => {});
    }
    res.status(202).json({ accepted: true });
  } catch (error) { handlePrismaError(error, res, 'No se pudo registrar el evento.'); }
});

app.get('/api/rooms/:id', async (req, res) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id }, include: { artworks: true } });
    if (!room) return res.status(404).json({ error: 'Sala no encontrada.' });
    res.json(room);
  } catch (error) { handlePrismaError(error, res, 'Error al obtener sala.'); }
});

app.post('/api/rooms', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = cleanString(req.body.name, 120), theme = cleanString(req.body.theme, 200);
    validateRequired({ 'Nombre de la sala': name, 'Tema': theme });
    const type = allowedRoomTypes.includes(req.body.type) ? req.body.type : 'GRADIENT';
    const room = await prisma.room.create({ data: { name, theme, imageUrl: cleanString(req.body.imageUrl, 1000) || null, type, order: Number.isFinite(Number(req.body.order)) ? Number(req.body.order) : 0 } });
    res.status(201).json(room);
  } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear sala.'); }
});

app.put('/api/rooms/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const name = cleanString(req.body.name, 120), theme = cleanString(req.body.theme, 200);
    validateRequired({ 'Nombre de la sala': name, 'Tema': theme });
    const type = allowedRoomTypes.includes(req.body.type) ? req.body.type : 'GRADIENT';
    const room = await prisma.room.update({ where: { id: req.params.id }, data: { name, theme, imageUrl: cleanString(req.body.imageUrl, 1000) || null, type, order: Number(req.body.order) || 0 } });
    res.json(room);
  } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar sala.'); }
});

app.delete('/api/rooms/:id', authenticateToken, requireAdmin, async (req, res) => {
  try { await prisma.room.delete({ where: { id: req.params.id } }); res.json({ message: 'Sala eliminada.' }); }
  catch (error) { handlePrismaError(error, res, 'Error al eliminar sala.'); }
});

// ========================= OBRAS =========================
app.get('/api/artworks/:id', async (req, res) => {
  try {
    const artwork = await prisma.artwork.findUnique({ where: { id: req.params.id }, include: { room: true, category: true } });
    if (!artwork) return res.status(404).json({ error: 'Obra no encontrada.' });
    res.json(artwork);
  } catch (error) { handlePrismaError(error, res, 'Error al obtener obra.'); }
});

app.post('/api/artworks', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { roomId, title, artist, year, medium, dims, price, description } = req.body;
    validateRequired({ 'Sala': roomId, 'Título': title, 'Artista': artist, 'Año': year, 'Precio': price });
    const artwork = await prisma.artwork.create({ data: {
      roomId, title: cleanString(title, 180), artist: cleanString(artist, 160), year: cleanString(year, 30), medium: cleanString(medium, 160), dims: cleanString(dims, 100), price: cleanString(price, 60), priceAmount: validatePriceAmount(price), description: cleanString(description, 5000), imageUrl: cleanString(req.body.imageUrl, 1000) || null,
      status: allowedArtworkStatuses.includes(req.body.status) ? req.body.status : 'AVAILABLE',
      hotspotLeft: validatePercent(req.body.hotspotLeft), hotspotTop: validatePercent(req.body.hotspotTop), hotspotWidth: validatePercent(req.body.hotspotWidth), hotspotHeight: validatePercent(req.body.hotspotHeight), categoryId: cleanString(req.body.categoryId) || null
    } });
    res.status(201).json(artwork);
  } catch (error) { if (error.message?.includes('requerido') || error.message?.includes('hotspot') || error.message?.includes('precio')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear obra.'); }
});

app.put('/api/artworks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { roomId, title, artist, year, medium, dims, price, description } = req.body;
    validateRequired({ 'Sala': roomId, 'Título': title, 'Artista': artist, 'Año': year, 'Precio': price });
    const artwork = await prisma.artwork.update({ where: { id: req.params.id }, data: {
      roomId, title: cleanString(title, 180), artist: cleanString(artist, 160), year: cleanString(year, 30), medium: cleanString(medium, 160), dims: cleanString(dims, 100), price: cleanString(price, 60), priceAmount: validatePriceAmount(price), description: cleanString(description, 5000), imageUrl: cleanString(req.body.imageUrl, 1000) || null,
      status: allowedArtworkStatuses.includes(req.body.status) ? req.body.status : undefined,
      hotspotLeft: validatePercent(req.body.hotspotLeft), hotspotTop: validatePercent(req.body.hotspotTop), hotspotWidth: validatePercent(req.body.hotspotWidth), hotspotHeight: validatePercent(req.body.hotspotHeight), categoryId: cleanString(req.body.categoryId) || null
    } });
    res.json(artwork);
  } catch (error) { if (error.message?.includes('requerido') || error.message?.includes('hotspot') || error.message?.includes('precio')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar obra.'); }
});

app.patch('/api/artworks/:id/hotspot', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const data = { hotspotLeft: validatePercent(req.body.hotspotLeft), hotspotTop: validatePercent(req.body.hotspotTop), hotspotWidth: validatePercent(req.body.hotspotWidth), hotspotHeight: validatePercent(req.body.hotspotHeight) };
    const artwork = await prisma.artwork.update({ where: { id: req.params.id }, data });
    res.json(artwork);
  } catch (error) { if (error.message?.includes('hotspot')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar hotspot.'); }
});

app.delete('/api/artworks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try { await prisma.artwork.delete({ where: { id: req.params.id } }); res.json({ message: 'Obra eliminada.' }); }
  catch (error) { handlePrismaError(error, res, 'Error al eliminar obra.'); }
});

// ========================= LIBROS =========================
app.get('/api/books', async (req, res) => {
  try { res.json(await prisma.book.findMany({ orderBy: { createdAt: 'desc' } })); }
  catch (error) { handlePrismaError(error, res, 'Error al obtener libros.'); }
});
app.get('/api/books/:id', async (req, res) => {
  try { const book = await prisma.book.findUnique({ where: { id: req.params.id } }); if (!book) return res.status(404).json({ error: 'Libro no encontrado.' }); res.json(book); }
  catch (error) { handlePrismaError(error, res, 'Error al obtener libro.'); }
});
app.post('/api/books', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, author, year, description, price } = req.body;
    validateRequired({ 'Título': title, 'Autor': author, 'Año': year, 'Precio': price });
    const stock = req.body.stock === undefined ? 1 : Number(req.body.stock);
    if (!Number.isSafeInteger(stock) || stock < 0) return res.status(400).json({ error: 'La existencia debe ser un entero igual o mayor que cero.' });
    const book = await prisma.book.create({ data: { title: cleanString(title, 180), author: cleanString(author, 160), year: cleanString(year, 30), description: cleanString(description, 5000), price: cleanString(price, 60), priceAmount: validatePriceAmount(price), coverUrl: cleanString(req.body.coverUrl, 1000) || null, stock } });
    res.status(201).json(book);
  } catch (error) { if (error.message?.includes('requerido') || error.message?.includes('precio')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear libro.'); }
});
app.put('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, author, year, description, price } = req.body;
    validateRequired({ 'Título': title, 'Autor': author, 'Año': year, 'Precio': price });
    const stock = Number(req.body.stock);
    if (!Number.isSafeInteger(stock) || stock < 0) return res.status(400).json({ error: 'La existencia debe ser un entero igual o mayor que cero.' });
    const book = await prisma.book.update({ where: { id: req.params.id }, data: { title: cleanString(title, 180), author: cleanString(author, 160), year: cleanString(year, 30), description: cleanString(description, 5000), price: cleanString(price, 60), priceAmount: validatePriceAmount(price), coverUrl: cleanString(req.body.coverUrl, 1000) || null, stock } });
    res.json(book);
  } catch (error) { if (error.message?.includes('requerido') || error.message?.includes('precio')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar libro.'); }
});
app.post('/api/books/:id/stock-adjustment', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const delta = Number(req.body.delta);
    if (!Number.isSafeInteger(delta) || delta === 0 || Math.abs(delta) > 100) return res.status(400).json({ error: 'El ajuste debe ser un entero entre -100 y 100, distinto de cero.' });
    if (delta < 0) {
      const changed = await prisma.book.updateMany({ where: { id: req.params.id, stock: { gte: Math.abs(delta) } }, data: { stock: { decrement: Math.abs(delta) } } });
      if (!changed.count) {
        const exists = await prisma.book.findUnique({ where: { id: req.params.id }, select: { id: true } });
        return res.status(exists ? 409 : 404).json({ error: exists ? 'No hay suficientes ejemplares para reducir el inventario.' : 'Libro no encontrado.' });
      }
    } else {
      const changed = await prisma.book.updateMany({ where: { id: req.params.id }, data: { stock: { increment: delta } } });
      if (!changed.count) return res.status(404).json({ error: 'Libro no encontrado.' });
    }
    res.json(await prisma.book.findUnique({ where: { id: req.params.id } }));
  } catch (error) { handlePrismaError(error, res, 'Error al ajustar el inventario.'); }
});
app.delete('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => { try { await prisma.book.delete({ where: { id: req.params.id } }); res.json({ message: 'Libro eliminado.' }); } catch (error) { handlePrismaError(error, res, 'Error al eliminar libro.'); } });

// ========================= CATEGORÍAS =========================
app.get('/api/categories', async (req, res) => { try { res.json(await prisma.category.findMany({ include: { artworks: true }, orderBy: { name: 'asc' } })); } catch (error) { handlePrismaError(error, res, 'Error al obtener categorías.'); } });
app.get('/api/categories/:slug', async (req, res) => { try { const category = await prisma.category.findUnique({ where: { slug: req.params.slug }, include: { artworks: true } }); if (!category) return res.status(404).json({ error: 'Categoría no encontrada.' }); res.json(category); } catch (error) { handlePrismaError(error, res, 'Error al obtener categoría.'); } });
app.post('/api/categories', authenticateToken, requireAdmin, async (req, res) => { try { const slug = createSlug(req.body.slug); const name = cleanString(req.body.name, 120), description = cleanString(req.body.description, 5000); validateRequired({ 'Nombre': name, 'Enlace': slug }); const category = await prisma.category.create({ data: { slug, name, description } }); res.status(201).json(category); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear categoría.'); } });
app.put('/api/categories/:slug', authenticateToken, requireAdmin, async (req, res) => { try { const name = cleanString(req.body.name, 120), description = cleanString(req.body.description, 5000), slug = createSlug(req.body.slug || req.params.slug); validateRequired({ 'Nombre': name, 'Enlace': slug }); const category = await prisma.category.update({ where: { slug: req.params.slug }, data: { slug, name, description } }); res.json(category); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar categoría.'); } });
app.delete('/api/categories/:slug', authenticateToken, requireAdmin, async (req, res) => { try { await prisma.category.delete({ where: { slug: req.params.slug } }); res.json({ message: 'Categoría eliminada.' }); } catch (error) { handlePrismaError(error, res, 'Error al eliminar categoría.'); } });

// ========================= ACERCA DE =========================
app.get('/api/about', async (req, res) => { try { res.json(await prisma.aboutContent.findFirst()); } catch (error) { handlePrismaError(error, res, 'Error al obtener información.'); } });
app.put('/api/about', authenticateToken, requireAdmin, async (req, res) => { try { const data = { title: cleanString(req.body.title, 180), description: cleanString(req.body.description, 10000), address: cleanString(req.body.address, 300) || null, phone: cleanString(req.body.phone, 60) || null, email: cleanString(req.body.email, 180) || null, hours: cleanString(req.body.hours, 300) || null }; validateRequired({ 'Título': data.title }); const existing = await prisma.aboutContent.findFirst(); const result = existing ? await prisma.aboutContent.update({ where: { id: existing.id }, data }) : await prisma.aboutContent.create({ data }); res.json(result); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar información.'); } });

// ========================= MÉTODOS DE PAGO =========================
app.get('/api/payment-methods', async (req, res) => {
  try {
    let includeInactive = false;
    if (req.query.all === '1') {
      const auth = req.headers.authorization || '';
      const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
      const cookie = (req.headers.cookie || '').split(';').map(part => part.trim()).find(part => part.startsWith('balam_session='));
      const token = bearer && !['null', 'undefined'].includes(bearer) ? bearer : cookie ? decodeURIComponent(cookie.slice('balam_session='.length)) : '';
      try { const decoded = require('jsonwebtoken').verify(token, process.env.JWT_SECRET); const user = await prisma.user.findUnique({ where: { id: decoded.id }, select: { role: true } }); includeInactive = user?.role === 'ADMIN'; } catch (_) {}
    }
    const where = includeInactive ? {} : { active: true };
    res.json(await prisma.paymentMethod.findMany({ where, orderBy: { createdAt: 'asc' } }));
  } catch (error) { handlePrismaError(error, res, 'Error al obtener métodos de pago.'); }
});
app.post('/api/payment-methods', authenticateToken, requireAdmin, async (req, res) => { try { const label = cleanString(req.body.label, 120), icon = cleanString(req.body.icon, 20), instructions = cleanString(req.body.instructions, 2000) || null; validateRequired({ 'Etiqueta': label, 'Icono': icon }); const method = await prisma.paymentMethod.create({ data: { label, icon, instructions, active: req.body.active !== false } }); res.status(201).json(method); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear método de pago.'); } });
app.put('/api/payment-methods/:id', authenticateToken, requireAdmin, async (req, res) => { try { const label = cleanString(req.body.label, 120), icon = cleanString(req.body.icon, 20); validateRequired({ 'Etiqueta': label, 'Icono': icon }); const data = { label, icon, active: req.body.active !== false }; if (Object.hasOwn(req.body, 'instructions')) data.instructions = cleanString(req.body.instructions, 2000) || null; const method = await prisma.paymentMethod.update({ where: { id: req.params.id }, data }); res.json(method); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar método de pago.'); } });
app.delete('/api/payment-methods/:id', authenticateToken, requireAdmin, async (req, res) => { try { await prisma.paymentMethod.delete({ where: { id: req.params.id } }); res.json({ message: 'Método de pago eliminado.' }); } catch (error) { handlePrismaError(error, res, 'Error al eliminar método de pago.'); } });

// ========================= PEDIDOS =========================
app.post('/api/orders', authenticateToken, requireClientOrAdmin, async (req, res) => {
  try {
    const itemType = cleanString(req.body.itemType).toUpperCase();
    const itemId = cleanString(req.body.itemId);
    const paymentMethod = cleanString(req.body.paymentMethod, 80);
    if (!allowedItemTypes.includes(itemType) || !itemId || !paymentMethod) return res.status(400).json({ error: 'Artículo y método de pago son requeridos.' });
    const validPayment = await prisma.paymentMethod.findFirst({ where: { id: paymentMethod, active: true } });
    if (!validPayment) return res.status(400).json({ error: 'El método de pago seleccionado no está disponible.' });

    const order = await prisma.$transaction(async (tx) => {
      let priceAtPurchase, priceAmount, artworkId = null, bookId = null;
      if (itemType === 'ARTWORK') {
        const artwork = await tx.artwork.findUnique({ where: { id: itemId } });
        if (!artwork) throw Object.assign(new Error('Obra no encontrada.'), { status: 404 });
        const reserved = await tx.artwork.updateMany({ where: { id: artwork.id, status: 'AVAILABLE' }, data: { status: 'RESERVED' } });
        if (reserved.count !== 1) throw Object.assign(new Error('Esta obra ya no está disponible.'), { status: 409 });
        priceAtPurchase = artwork.price; priceAmount = artwork.priceAmount; artworkId = artwork.id;
      } else {
        const reserved = await tx.book.updateMany({ where: { id: itemId, stock: { gt: 0 } }, data: { stock: { decrement: 1 } } });
        if (!reserved.count) {
          const exists = await tx.book.findUnique({ where: { id: itemId }, select: { id: true } });
          if (!exists) throw Object.assign(new Error('Libro no encontrado.'), { status: 404 });
          throw Object.assign(new Error('Este libro está agotado.'), { status: 409 });
        }
        const book = await tx.book.findUnique({ where: { id: itemId } });
        priceAtPurchase = book.price; priceAmount = book.priceAmount; bookId = book.id;
      }
      const created = await tx.order.create({ data: { userId: req.user.id, itemType, artworkId, bookId, priceAtPurchase, priceAmount, paymentMethod, status: 'PENDING' }, include: { artwork: true, book: true } });
      await tx.orderStatusHistory.create({ data: { orderId: created.id, toStatus: 'PENDING', changedByUserId: req.user.id, note: 'Pedido creado.' } });
      return created;
    });
    void sendEmail(req.user.email, `Pedido recibido · ${order.id.slice(0, 8)}`, `Hola ${req.user.name}, recibimos tu pedido ${order.id.slice(0, 8)}. Estado: pendiente. La galería te compartirá los datos para transferir y verificará manualmente el depósito.`);
    void sendEmail(process.env.ADMIN_EMAIL, `Nuevo pedido · ${order.id.slice(0, 8)}`, `Se recibió un pedido de ${req.user.name} (${req.user.email}). Artículo: ${order.artwork?.title || order.book?.title || 'Catálogo BALAM'}. Revisa el panel de administración.`);
    res.status(201).json(order);
  } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear pedido.'); }
});

app.get('/api/orders', authenticateToken, requireClientOrAdmin, async (req, res) => {
  try {
    const where = req.user.role === 'ADMIN' && req.query.all === '1' ? {} : { userId: req.user.id };
    if (req.query.status && allowedStatuses.includes(req.query.status)) where.status = req.query.status;
    if (req.query.from || req.query.to) where.createdAt = {};
    if (req.query.from) where.createdAt.gte = new Date(`${req.query.from}T00:00:00`);
    if (req.query.to) where.createdAt.lte = new Date(`${req.query.to}T23:59:59.999`);
    if (req.query.page !== undefined || req.query.pageSize !== undefined) {
      const page = Math.max(1, Math.min(10000, Number.parseInt(req.query.page, 10) || 1));
      const pageSize = Math.max(1, Math.min(100, Number.parseInt(req.query.pageSize, 10) || 25));
      const [items, total] = await Promise.all([
        prisma.order.findMany({ where, include: { artwork: true, book: true, paymentProof: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, uploadedAt: true } }, user: { select: { id: true, name: true, email: true, phone: true, address: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
        prisma.order.count({ where })
      ]);
      return res.json({ items, page, pageSize, total, pages: Math.ceil(total / pageSize) });
    }
    res.json(await prisma.order.findMany({ where, include: { artwork: true, book: true, paymentProof: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, uploadedAt: true } }, user: { select: { id: true, name: true, email: true, phone: true, address: true } } }, orderBy: { createdAt: 'desc' } }));
  } catch (error) { handlePrismaError(error, res, 'Error al obtener pedidos.'); }
});

app.post('/api/orders/:id/payment-proof', authenticateToken, requireClientOrAdmin, async (req, res) => {
  try {
    if (isServerless) return res.status(501).json({ error: 'El almacenamiento privado de comprobantes aún no está configurado para este servidor.' });
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { paymentProof: true, user: { select: { name: true, email: true } } } });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) return res.status(403).json({ error: 'No puedes adjuntar comprobantes a este pedido.' });
    if (order.paymentMethod !== 'transfer') return res.status(400).json({ error: 'Este pedido no está configurado para transferencia bancaria.' });
    if (!['PENDING', 'CONFIRMED'].includes(order.status)) return res.status(409).json({ error: 'El pedido ya no acepta comprobantes.' });

    const dataUrl = cleanString(req.body.dataUrl, 7 * 1024 * 1024);
    const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp)|application\/pdf);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return res.status(400).json({ error: 'Adjunta un comprobante JPG, PNG, WEBP o PDF.' });
    const mimeType = match[1];
    const bytes = Buffer.from(match[2], 'base64');
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'El comprobante debe pesar 5 MB o menos.' });
    const signatures = {
      'image/jpeg': bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
      'image/png': bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
      'image/webp': bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP',
      'application/pdf': bytes.toString('ascii', 0, 5) === '%PDF-'
    };
    if (!signatures[mimeType]) return res.status(400).json({ error: 'El contenido del archivo no coincide con su formato.' });

    const safeName = path.win32.basename(path.basename(cleanString(req.body.fileName, 160))).replace(/[\r\n"<>]/g, '_').slice(0, 120) || 'comprobante';
    const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'application/pdf': '.pdf' }[mimeType];
    const storageName = `${crypto.randomBytes(24).toString('hex')}${ext}`;
    const newPath = path.join(privateUploadsDir, storageName);
    fs.writeFileSync(newPath, bytes, { flag: 'wx' });
    try {
      const proof = await prisma.orderPaymentProof.upsert({
        where: { orderId: order.id },
        create: { orderId: order.id, storageName, originalName: safeName, mimeType, sizeBytes: bytes.length },
        update: { storageName, originalName: safeName, mimeType, sizeBytes: bytes.length, uploadedAt: new Date() },
        select: { id: true, originalName: true, mimeType: true, sizeBytes: true, uploadedAt: true }
      });
      if (order.paymentProof?.storageName) fs.promises.unlink(path.join(privateUploadsDir, order.paymentProof.storageName)).catch(() => {});
      void sendEmail(process.env.ADMIN_EMAIL, `Comprobante recibido · ${order.id.slice(0, 8)}`, `El cliente ${order.user.name} (${order.user.email}) adjuntó un comprobante al pedido ${order.id.slice(0, 8)}. Verifícalo en el panel.`);
      res.status(201).json({ paymentProof: proof });
    } catch (error) {
      fs.promises.unlink(newPath).catch(() => {});
      throw error;
    }
  } catch (error) { handlePrismaError(error, res, 'Error al guardar el comprobante.'); }
});

app.get('/api/orders/:id/payment-proof', authenticateToken, requireClientOrAdmin, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { paymentProof: true } });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (req.user.role !== 'ADMIN' && order.userId !== req.user.id) return res.status(403).json({ error: 'No puedes consultar este comprobante.' });
    if (!order.paymentProof) return res.status(404).json({ error: 'Este pedido aún no tiene comprobante.' });
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="comprobante${path.extname(order.paymentProof.storageName)}"`);
    res.type(order.paymentProof.mimeType).sendFile(path.join(privateUploadsDir, order.paymentProof.storageName));
  } catch (error) { handlePrismaError(error, res, 'Error al consultar el comprobante.'); }
});

app.post('/api/orders/:id/notes', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const body = cleanString(req.body.body, 2000);
    if (!body) return res.status(400).json({ error: 'Escribe una nota antes de guardarla.' });
    if (!(await prisma.order.findUnique({ where: { id: req.params.id }, select: { id: true } }))) return res.status(404).json({ error: 'Pedido no encontrado.' });
    const note = await prisma.orderInternalNote.create({ data: { orderId: req.params.id, authorUserId: req.user.id, body }, include: { author: { select: { name: true } } } });
    res.status(201).json(note);
  } catch (error) { handlePrismaError(error, res, 'Error al guardar la nota privada.'); }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { artwork: true, book: true, paymentProof: { select: { id: true, originalName: true, mimeType: true, sizeBytes: true, uploadedAt: true } }, ...(req.user.role === 'ADMIN' ? { internalNotes: { include: { author: { select: { name: true } } }, orderBy: { createdAt: 'desc' } } } : {}), user: { select: { id: true, name: true, email: true, phone: true, address: true } }, statusHistory: { include: { changedBy: { select: { name: true, email: true } } }, orderBy: { createdAt: 'asc' } } } });
    if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ error: 'No tienes permiso para ver este pedido.' });
    res.json(order);
  } catch (error) { handlePrismaError(error, res, 'Error al obtener pedido.'); }
});

app.put('/api/orders/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const status = cleanString(req.body.status).toUpperCase();
    if (!allowedStatuses.includes(status)) return res.status(400).json({ error: 'Estado de pedido inválido.' });
    const updated = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id: req.params.id } });
      if (!order) throw Object.assign(new Error('Pedido no encontrado.'), { status: 404 });
      if (!isValidOrderTransition(order.status, status)) throw Object.assign(new Error(`No se permite cambiar el pedido de ${order.status} a ${status}.`), { status: 409 });
      const changed = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status } });
      if (changed.count !== 1) throw Object.assign(new Error('El pedido cambió mientras se procesaba. Recarga e inténtalo de nuevo.'), { status: 409 });
      if (order.artworkId) {
        let artworkStatus;
        if (status === 'CANCELLED') artworkStatus = 'AVAILABLE';
        else if (status === 'PAID' || status === 'DELIVERED') artworkStatus = 'SOLD';
        else if (status === 'PENDING' || status === 'CONFIRMED') artworkStatus = 'RESERVED';
        if (artworkStatus) await tx.artwork.update({ where: { id: order.artworkId }, data: { status: artworkStatus } });
      }
      if (order.bookId && status === 'CANCELLED') await tx.book.update({ where: { id: order.bookId }, data: { stock: { increment: 1 } } });
      await tx.orderStatusHistory.create({ data: { orderId: order.id, fromStatus: order.status, toStatus: status, changedByUserId: req.user.id } });
      return tx.order.findUnique({ where: { id: order.id }, include: { artwork: true, book: true, user: { select: { name: true, email: true, phone: true, address: true } }, statusHistory: { orderBy: { createdAt: 'asc' } } } });
    });
    const readableStatus = { CONFIRMED: 'confirmado', PAID: 'pagado', CANCELLED: 'cancelado', DELIVERED: 'entregado' }[status] || status.toLowerCase();
    void sendEmail(updated.user?.email, `Actualización del pedido · ${updated.id.slice(0, 8)}`, `Hola ${updated.user?.name || ''}, el estado de tu pedido ${updated.id.slice(0, 8)} cambió a: ${readableStatus}. Puedes consultar el detalle en Mis pedidos.`);
    res.json(updated);
  } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar estado del pedido.'); }
});

// ========================= DASHBOARD ADMIN =========================
app.get('/api/admin/orders.csv', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const orders = await prisma.order.findMany({ take: 10000, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true, email: true } }, artwork: { select: { title: true } }, book: { select: { title: true } } } });
    const rows = [['Folio', 'Fecha', 'Cliente', 'Correo', 'Artículo', 'Tipo', 'Estado', 'Método de pago', 'Monto (GTQ)']];
    orders.forEach(order => rows.push([
      order.id, order.createdAt.toISOString(), order.user?.name, order.user?.email,
      order.artwork?.title || order.book?.title || '', order.itemType, order.status,
      order.paymentMethod, order.priceAmount
    ]));
    const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="balam-pedidos.csv"');
    res.send(csv);
  } catch (error) { handlePrismaError(error, res, 'Error al exportar pedidos.'); }
});

app.get('/api/admin/sales-by-month', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const rows = await prisma.$queryRaw`SELECT DATE_TRUNC('month', "createdAt") AS month, COUNT(*)::int AS order_count, COALESCE(SUM("priceAmount"),0)::int AS total_revenue FROM "Order" WHERE status IN ('PAID','DELIVERED') GROUP BY DATE_TRUNC('month', "createdAt") ORDER BY month DESC LIMIT 12`;
    res.json(rows);
  } catch (error) { handlePrismaError(error, res, 'Error al obtener histórico de ventas.'); }
});

app.get('/api/admin/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const [monthOrders, monthRevenue, ordersByStatus, recentOrders] = await Promise.all([
      prisma.order.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
      prisma.order.aggregate({ _sum: { priceAmount: true }, where: { createdAt: { gte: monthStart, lt: monthEnd }, status: { in: ['PAID', 'DELIVERED'] } } }),
      prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.order.findMany({ take: 25, orderBy: { createdAt: 'desc' }, include: { artwork: true, book: true, user: { select: { name: true, email: true } } } })
    ]);
    res.json({ monthOrders, monthRevenue: monthRevenue._sum.priceAmount || 0, ordersByStatus, recentOrders });
  } catch (error) { handlePrismaError(error, res, 'Error al cargar dashboard.'); }
});

app.get('/api/admin/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const requestedDays = Number.parseInt(req.query.days, 10) || 30;
    const days = Math.max(1, Math.min(90, requestedDays));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const [byEvent, mostViewed] = await Promise.all([
      prisma.analyticsEvent.groupBy({ by: ['eventKey'], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      prisma.analyticsEvent.groupBy({ by: ['itemId'], where: { eventKey: 'ARTWORK_VIEW', itemId: { not: null }, createdAt: { gte: since } }, _count: { itemId: true }, orderBy: { _count: { itemId: 'desc' } }, take: 5 })
    ]);
    const artworkIds = mostViewed.map(item => item.itemId).filter(Boolean);
    const artworks = await prisma.artwork.findMany({ where: { id: { in: artworkIds } }, select: { id: true, title: true, artist: true } });
    const artworkById = new Map(artworks.map(artwork => [artwork.id, artwork]));
    res.json({ days, byEvent: byEvent.map(item => ({ eventKey: item.eventKey, count: item._count._all })), mostViewed: mostViewed.map(item => ({ itemId: item.itemId, count: item._count.itemId, artwork: artworkById.get(item.itemId) || null })) });
  } catch (error) { handlePrismaError(error, res, 'Error al cargar las métricas de uso.'); }
});

// Resumen de facturación del mes actual. Se calcula únicamente con ventas cobradas
// para que los pedidos pendientes no inflen los ingresos mostrados al administrador.
app.get('/api/admin/billing', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const paidWhere = { createdAt: { gte: monthStart, lt: monthEnd }, status: { in: ['PAID', 'DELIVERED'] } };
    const [paidOrders, allMonthOrders, customers, byPaymentMethod, byItemType] = await Promise.all([
      prisma.order.findMany({ where: paidWhere, select: { priceAmount: true } }),
      prisma.order.count({ where: { createdAt: { gte: monthStart, lt: monthEnd } } }),
      prisma.order.findMany({ where: paidWhere, distinct: ['userId'], select: { userId: true } }),
      prisma.order.groupBy({ by: ['paymentMethod'], where: paidWhere, _count: { _all: true }, _sum: { priceAmount: true } }),
      prisma.order.groupBy({ by: ['itemType'], where: paidWhere, _count: { _all: true }, _sum: { priceAmount: true } })
    ]);
    const revenue = paidOrders.reduce((total, order) => total + order.priceAmount, 0);
    res.json({
      period: { start: monthStart, end: monthEnd },
      totals: { revenue, paidOrders: paidOrders.length, allMonthOrders, customers: customers.length },
      byPaymentMethod,
      byItemType
    });
  } catch (error) { handlePrismaError(error, res, 'Error al cargar la facturación.'); }
});

app.use('/api', (req, res) => res.status(404).json({ error: 'Endpoint no encontrado.' }));

// Exportar para Vercel Serverless Functions
module.exports = app;

// Solo escuchar en puerto si no está en Vercel
if (require.main === module) {
  const server = app.listen(PORT, () => console.log(`🎨 BALAM ejecutándose en http://localhost:${PORT}`));

  async function shutdown(signal) {
    console.log(`\n${signal}: cerrando BALAM...`);
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  }
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

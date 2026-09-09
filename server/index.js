require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, requireAdmin, requireClientOrAdmin, generateToken } = require('./middleware/auth');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const prisma = new PrismaClient();
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET no está definido. Configúralo antes de producción.');
}

app.disable('x-powered-by');
app.use(cors({ origin: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '..')));

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedStatuses = ['PENDING', 'CONFIRMED', 'PAID', 'CANCELLED', 'DELIVERED'];
const allowedArtworkStatuses = ['AVAILABLE', 'SOLD', 'RESERVED'];
const allowedRoomTypes = ['PHOTO', 'GRADIENT'];
const allowedItemTypes = ['ARTWORK', 'BOOK'];

function cleanString(value, max = 5000) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

function parsePriceToAmount(priceString) {
  if (typeof priceString === 'number' && Number.isFinite(priceString)) return Math.round(priceString);
  const numericString = cleanString(priceString).replace(/[^0-9]/g, '');
  return Number.parseInt(numericString, 10) || 0;
}

function validatePercent(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 100) throw new Error('Las posiciones del hotspot deben estar entre 0 y 100.');
  return number;
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
    res.json({ token: generateToken(user), user: publicUser(user) });
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
    res.status(201).json({ token: generateToken(user), user: publicUser(user) });
  } catch (error) { handlePrismaError(error, res, 'Error al registrar usuario.'); }
});

app.get('/api/auth/verify', authenticateToken, (req, res) => res.json({ valid: true, user: req.user }));

app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const email = cleanString(req.body.email).toLowerCase();
    const generic = { message: 'Si el email existe, se ha generado un enlace de recuperación.' };
    if (!emailRegex.test(email)) return res.json(generic);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(generic);
    const resetToken = crypto.randomBytes(32).toString('hex');
    await prisma.user.update({ where: { id: user.id }, data: { resetToken, resetTokenExpires: new Date(Date.now() + 60 * 60 * 1000) } });
    console.log(`[BALAM] Token de recuperación para ${email}: ${resetToken}`);
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
    const user = await prisma.user.findFirst({ where: { resetToken: token, resetTokenExpires: { gt: new Date() } } });
    if (!user) return res.status(400).json({ error: 'Token inválido o expirado.' });
    await prisma.user.update({ where: { id: user.id }, data: { password: await bcrypt.hash(newPassword, 12), resetToken: null, resetTokenExpires: null } });
    res.json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (error) { handlePrismaError(error, res, 'Error al restablecer contraseña.'); }
});

// ========================= UPLOADS =========================
app.post('/api/uploads/image', authenticateToken, requireAdmin, async (req, res) => {
  try {
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
      roomId, title: cleanString(title, 180), artist: cleanString(artist, 160), year: cleanString(year, 30), medium: cleanString(medium, 160), dims: cleanString(dims, 100), price: cleanString(price, 60), priceAmount: parsePriceToAmount(price), description: cleanString(description, 5000),
      status: allowedArtworkStatuses.includes(req.body.status) ? req.body.status : 'AVAILABLE',
      hotspotLeft: validatePercent(req.body.hotspotLeft), hotspotTop: validatePercent(req.body.hotspotTop), hotspotWidth: validatePercent(req.body.hotspotWidth), hotspotHeight: validatePercent(req.body.hotspotHeight), categoryId: cleanString(req.body.categoryId) || null
    } });
    res.status(201).json(artwork);
  } catch (error) { if (error.message?.includes('requerido') || error.message?.includes('hotspot')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear obra.'); }
});

app.put('/api/artworks/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { roomId, title, artist, year, medium, dims, price, description } = req.body;
    validateRequired({ 'Sala': roomId, 'Título': title, 'Artista': artist, 'Año': year, 'Precio': price });
    const artwork = await prisma.artwork.update({ where: { id: req.params.id }, data: {
      roomId, title: cleanString(title, 180), artist: cleanString(artist, 160), year: cleanString(year, 30), medium: cleanString(medium, 160), dims: cleanString(dims, 100), price: cleanString(price, 60), priceAmount: parsePriceToAmount(price), description: cleanString(description, 5000),
      status: allowedArtworkStatuses.includes(req.body.status) ? req.body.status : undefined,
      hotspotLeft: validatePercent(req.body.hotspotLeft), hotspotTop: validatePercent(req.body.hotspotTop), hotspotWidth: validatePercent(req.body.hotspotWidth), hotspotHeight: validatePercent(req.body.hotspotHeight), categoryId: cleanString(req.body.categoryId) || null
    } });
    res.json(artwork);
  } catch (error) { if (error.message?.includes('requerido') || error.message?.includes('hotspot')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar obra.'); }
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
  try { const { title, author, year, description, price } = req.body; validateRequired({ 'Título': title, 'Autor': author, 'Año': year, 'Precio': price }); const book = await prisma.book.create({ data: { title: cleanString(title, 180), author: cleanString(author, 160), year: cleanString(year, 30), description: cleanString(description, 5000), price: cleanString(price, 60), priceAmount: parsePriceToAmount(price), coverUrl: cleanString(req.body.coverUrl, 1000) || null } }); res.status(201).json(book); }
  catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear libro.'); }
});
app.put('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => {
  try { const { title, author, year, description, price } = req.body; validateRequired({ 'Título': title, 'Autor': author, 'Año': year, 'Precio': price }); const book = await prisma.book.update({ where: { id: req.params.id }, data: { title: cleanString(title, 180), author: cleanString(author, 160), year: cleanString(year, 30), description: cleanString(description, 5000), price: cleanString(price, 60), priceAmount: parsePriceToAmount(price), coverUrl: cleanString(req.body.coverUrl, 1000) || null } }); res.json(book); }
  catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar libro.'); }
});
app.delete('/api/books/:id', authenticateToken, requireAdmin, async (req, res) => { try { await prisma.book.delete({ where: { id: req.params.id } }); res.json({ message: 'Libro eliminado.' }); } catch (error) { handlePrismaError(error, res, 'Error al eliminar libro.'); } });

// ========================= CATEGORÍAS =========================
app.get('/api/categories', async (req, res) => { try { res.json(await prisma.category.findMany({ include: { artworks: true }, orderBy: { name: 'asc' } })); } catch (error) { handlePrismaError(error, res, 'Error al obtener categorías.'); } });
app.get('/api/categories/:slug', async (req, res) => { try { const category = await prisma.category.findUnique({ where: { slug: req.params.slug }, include: { artworks: true } }); if (!category) return res.status(404).json({ error: 'Categoría no encontrada.' }); res.json(category); } catch (error) { handlePrismaError(error, res, 'Error al obtener categoría.'); } });
app.post('/api/categories', authenticateToken, requireAdmin, async (req, res) => { try { const slug = cleanString(req.body.slug, 80).toLowerCase().replace(/[^a-z0-9-]/g, '-'); const name = cleanString(req.body.name, 120), description = cleanString(req.body.description, 5000); validateRequired({ 'Nombre': name }); const category = await prisma.category.create({ data: { slug, name, description } }); res.status(201).json(category); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear categoría.'); } });
app.put('/api/categories/:slug', authenticateToken, requireAdmin, async (req, res) => { try { const name = cleanString(req.body.name, 120), description = cleanString(req.body.description, 5000); validateRequired({ 'Nombre': name }); const category = await prisma.category.update({ where: { slug: req.params.slug }, data: { name, description } }); res.json(category); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar categoría.'); } });
app.delete('/api/categories/:slug', authenticateToken, requireAdmin, async (req, res) => { try { await prisma.category.delete({ where: { slug: req.params.slug } }); res.json({ message: 'Categoría eliminada.' }); } catch (error) { handlePrismaError(error, res, 'Error al eliminar categoría.'); } });

// ========================= ACERCA DE =========================
app.get('/api/about', async (req, res) => { try { res.json(await prisma.aboutContent.findFirst()); } catch (error) { handlePrismaError(error, res, 'Error al obtener información.'); } });
app.put('/api/about', authenticateToken, requireAdmin, async (req, res) => { try { const data = { title: cleanString(req.body.title, 180), description: cleanString(req.body.description, 10000), address: cleanString(req.body.address, 300) || null, phone: cleanString(req.body.phone, 60) || null, email: cleanString(req.body.email, 180) || null, hours: cleanString(req.body.hours, 300) || null }; validateRequired({ 'Título': data.title }); const existing = await prisma.aboutContent.findFirst(); const result = existing ? await prisma.aboutContent.update({ where: { id: existing.id }, data }) : await prisma.aboutContent.create({ data }); res.json(result); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar información.'); } });

// ========================= MÉTODOS DE PAGO =========================
app.get('/api/payment-methods', async (req, res) => {
  try {
    let includeInactive = false;
    const auth = req.headers.authorization;
    if (req.query.all === '1' && auth) {
      try { const decoded = require('jsonwebtoken').verify(auth.split(' ')[1], process.env.JWT_SECRET); includeInactive = decoded.role === 'ADMIN'; } catch (_) {}
    }
    const where = includeInactive ? {} : { active: true };
    res.json(await prisma.paymentMethod.findMany({ where, orderBy: { createdAt: 'asc' } }));
  } catch (error) { handlePrismaError(error, res, 'Error al obtener métodos de pago.'); }
});
app.post('/api/payment-methods', authenticateToken, requireAdmin, async (req, res) => { try { const label = cleanString(req.body.label, 120), icon = cleanString(req.body.icon, 20); validateRequired({ 'Etiqueta': label, 'Icono': icon }); const method = await prisma.paymentMethod.create({ data: { label, icon, active: req.body.active !== false } }); res.status(201).json(method); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al crear método de pago.'); } });
app.put('/api/payment-methods/:id', authenticateToken, requireAdmin, async (req, res) => { try { const label = cleanString(req.body.label, 120), icon = cleanString(req.body.icon, 20); validateRequired({ 'Etiqueta': label, 'Icono': icon }); const method = await prisma.paymentMethod.update({ where: { id: req.params.id }, data: { label, icon, active: req.body.active !== false } }); res.json(method); } catch (error) { if (error.message?.includes('requerido')) return res.status(400).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar método de pago.'); } });
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
        const book = await tx.book.findUnique({ where: { id: itemId } });
        if (!book) throw Object.assign(new Error('Libro no encontrado.'), { status: 404 });
        priceAtPurchase = book.price; priceAmount = book.priceAmount; bookId = book.id;
      }
      return tx.order.create({ data: { userId: req.user.id, itemType, artworkId, bookId, priceAtPurchase, priceAmount, paymentMethod, status: 'PENDING' }, include: { artwork: true, book: true } });
    });
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
    res.json(await prisma.order.findMany({ where, include: { artwork: true, book: true, user: { select: { id: true, name: true, email: true, phone: true, address: true } } }, orderBy: { createdAt: 'desc' } }));
  } catch (error) { handlePrismaError(error, res, 'Error al obtener pedidos.'); }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id }, include: { artwork: true, book: true, user: { select: { id: true, name: true, email: true, phone: true, address: true } } } });
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
      if (order.artworkId) {
        let artworkStatus;
        if (status === 'CANCELLED') artworkStatus = 'AVAILABLE';
        else if (status === 'PAID' || status === 'DELIVERED') artworkStatus = 'SOLD';
        else if (status === 'PENDING' || status === 'CONFIRMED') artworkStatus = 'RESERVED';
        if (artworkStatus) await tx.artwork.update({ where: { id: order.artworkId }, data: { status: artworkStatus } });
      }
      return tx.order.update({ where: { id: order.id }, data: { status }, include: { artwork: true, book: true, user: { select: { name: true, email: true, phone: true, address: true } } } });
    });
    res.json(updated);
  } catch (error) { if (error.status) return res.status(error.status).json({ error: error.message }); handlePrismaError(error, res, 'Error al actualizar estado del pedido.'); }
});

// ========================= DASHBOARD ADMIN =========================
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

const server = app.listen(PORT, () => console.log(`🎨 BALAM ejecutándose en http://localhost:${PORT}`));

async function shutdown(signal) {
  console.log(`\n${signal}: cerrando BALAM...`);
  await prisma.$disconnect();
  server.close(() => process.exit(0));
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

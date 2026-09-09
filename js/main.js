/* ============================================================
   DATOS
   El contenido de la galería se carga exclusivamente desde la API.
   El seed inicial conserva los datos históricos del proyecto.
   ============================================================ */

/* ============================================================
   SISTEMA DE ROUTING Y NAVEGACIÓN
   ============================================================ */

// Variables de módulo para datos de la API
let roomsData = [];
let booksData = [];
let categoriesData = [];
let paymentMethodsData = [];
let dataLoaded = false;

/* ============================================================
   CONTROLADORES DEL HEADER DE ADMINISTRACIÓN
   Se registran al cargar el script, cuando el header ya está en el DOM.
   ============================================================ */

function toggleAdminAccountPanel(force){
  const panel = document.getElementById('admin-account-panel');
  const toggle = document.getElementById('admin-user-profile');
  if(!panel) return;
  // 'force' representa el estado DESEADO del panel (true = abrir, false = cerrar).
  // Si no se indica, se alterna según el estado actual.
  const shouldOpen = typeof force === 'boolean' ? force : !panel.classList.contains('open');
  if(shouldOpen){
    panel.classList.add('open');
    if(toggle) toggle.classList.add('active');
  } else {
    panel.classList.remove('open');
    if(toggle) toggle.classList.remove('active');
  }
  if(toggle) toggle.setAttribute('aria-expanded', String(shouldOpen));
}

function populateAdminAccountPanel(){
  const user = (typeof currentUser !== 'undefined' && currentUser) || {};
  const map = [
    ['account-panel-name', user.name || 'Administrador'],
    ['account-panel-email', user.email || 'admin@balam.gt'],
    ['admin-profile-name', user.name || 'Administrador'],
    ['admin-profile-email', user.email || 'admin@balam.gt']
  ];
  map.forEach(([id, val]) => {
    const el = document.getElementById(id);
    if(el) el.textContent = val;
  });
}

// Alias: cerrar el panel de cuenta del admin
function closeAdminAccountPanel(){
  toggleAdminAccountPanel(false);
}

function openPublicGalleryPreview(){
  closeAdminAccountPanel();
  renderRoomSelector();
  switchView('selector');
}

function initAdminHeader(){
  const profile = document.getElementById('admin-user-profile');
  const preview = document.getElementById('admin-preview-client-btn');
  const panelPreview = document.getElementById('admin-account-preview');
  const logout = document.getElementById('admin-account-logout');

  profile?.addEventListener('click', () => {
    populateAdminAccountPanel();
    toggleAdminAccountPanel();
  });
  preview?.addEventListener('click', openPublicGalleryPreview);
  panelPreview?.addEventListener('click', openPublicGalleryPreview);
  logout?.addEventListener('click', () => {
    closeAdminAccountPanel();
    adminLogout();
  });

  document.addEventListener('click', (event) => {
    if(!event.target.closest('#admin-account-wrap')) closeAdminAccountPanel();
  });
  document.addEventListener('keydown', (event) => {
    if(event.key === 'Escape') closeAdminAccountPanel();
  });
}

// El script se carga al final del documento, por lo que el header ya existe.
initAdminHeader();

/* ============================================================
   PANEL DE CUENTA DEL CLIENTE (desplegable estilo categorías)
   ============================================================ */

let clientAccountOpen = false;

function toggleClientAccountPanel(force){
  const panel = document.getElementById('client-account-panel');
  const toggle = document.getElementById('client-account-toggle');
  if(!panel) return;
  const shouldOpen = typeof force === 'boolean' ? force : !panel.classList.contains('open');
  if(shouldOpen){
    panel.classList.add('open');
    clientAccountOpen = true;
    if(toggle) toggle.classList.add('active');
  } else {
    panel.classList.remove('open');
    clientAccountOpen = false;
    if(toggle) toggle.classList.remove('active');
  }
  if(toggle) toggle.setAttribute('aria-expanded', String(shouldOpen));
}

function closeClientAccountPanel(){
  toggleClientAccountPanel(false);
}

function renderClientAccountPanel(){
  const panel = document.getElementById('client-account-panel');
  const logged = document.getElementById('client-account-logged');
  const links = document.getElementById('client-account-links');
  if(!panel || !links) return;

  const user = (typeof currentUser !== 'undefined' && currentUser);

  if(user && user.role !== 'ADMIN'){
    // Cliente logueado
    if(logged){
      logged.style.display = 'flex';
      const nm = document.getElementById('client-account-name');
      const em = document.getElementById('client-account-email');
      if(nm) nm.textContent = user.name || 'Cliente';
      if(em) em.textContent = user.email || '';
    }
    links.innerHTML = `
      <a href="#my-orders">Mis pedidos</a>
      <a href="#/selector">Explorar galería</a>
      <button type="button" id="client-account-logout" class="account-logout-item">Cerrar sesión</button>
    `;
  } else {
    // No logueado o admin
    if(logged) logged.style.display = 'none';
    links.innerHTML = `
      <a href="#client-login" class="account-login-link">Iniciar sesión</a>
      <a href="#client-register">Crear cuenta</a>
      <a href="#/selector">Explorar galería</a>
    `;
  }
}

function initClientAccountPanel(){
  const toggle = document.getElementById('client-account-toggle');
  const logoutBtn = document.getElementById('client-account-logout');

  if(toggle){
    toggle.removeEventListener('click', toggle._handleCA);
    toggle._handleCA = (e) => {
      e.stopPropagation();
      renderClientAccountPanel();
      toggleClientAccountPanel();
    };
    toggle.addEventListener('click', toggle._handleCA);
  }

  if(logoutBtn){
    logoutBtn.removeEventListener('click', logoutBtn._handleCALogout);
    logoutBtn._handleCALogout = (e) => {
      e.stopPropagation();
      closeClientAccountPanel();
      clientLogout();
    };
    logoutBtn.addEventListener('click', logoutBtn._handleCALogout);
  }
}

// Cerrar panel de cuenta del cliente al hacer clic fuera
document.addEventListener('click', function clientAccountOutside(e){
  try {
    let el = e.target;
    while(el && el.nodeType !== 1){ el = el.parentElement; }
    if(!el) return;
    if(el.closest('#client-account-logout')){
      e.preventDefault();
      e.stopPropagation();
      closeClientAccountPanel();
      clientLogout();
      return;
    }
    if(!el.closest('#client-account-wrap') && !el.closest('#client-account-panel')){
      closeClientAccountPanel();
      return;
    }
    // Cerrar al navegar con un enlace interno del panel (no el botón de logout)
    if(el.closest('#client-account-panel a') && !el.closest('#client-account-logout')){
      closeClientAccountPanel();
    }
  } catch(err){}
});

// Cerrar con Escape
document.addEventListener('keydown', function clientAccountEsc(e){
  if(e.key === 'Escape') closeClientAccountPanel();
});

// Re-renderizar el panel cuando cambie la sesión
function refreshClientAccount(){
  renderClientAccountPanel();
  // reactivar listener del botón de logout (si existe tras re-render)
  const logoutBtn = document.getElementById('client-account-logout');
  if(logoutBtn){
    logoutBtn.removeEventListener('click', logoutBtn._handleCALogout);
    logoutBtn._handleCALogout = (e) => { e.stopPropagation(); closeClientAccountPanel(); clientLogout(); };
    logoutBtn.addEventListener('click', logoutBtn._handleCALogout);
  }
}

// Cerrar sesión del cliente
function clientLogout(){
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  switchView('landing');
  refreshClientAccount();
  showToast('Sesión de cliente cerrada.');
}

// Registrar listeners del panel de cliente
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', initClientAccountPanel);
} else {
  initClientAccountPanel();
}

// Función para cargar datos de la API
async function loadApiData(force = false){
  if(dataLoaded && !force) return;
  const responses = await Promise.all([
    fetch('/api/rooms'), fetch('/api/books'), fetch('/api/categories'), fetch('/api/payment-methods')
  ]);
  if(responses.some(response => !response.ok)) throw new Error('No se pudo cargar la información de la galería.');
  const [rooms, books, categories, paymentMethods] = await Promise.all(responses.map(response => response.json()));
  roomsData = rooms || [];
  booksData = books || [];
  categoriesData = categories || [];
  paymentMethodsData = paymentMethods || [];
  dataLoaded = true;
  renderCategoriesPanel();
}

// Renderizar el panel de categorías del nav desde categoriesData
function renderCategoriesPanel(){
  const list = document.getElementById('categories-panel-list');
  if(!list) return;
  if(!categoriesData.length){
    list.innerHTML = '<li class="panel-empty-state">Próximamente nuevas categorías.</li>';
    return;
  }
  list.innerHTML = categoriesData.map(cat =>
    `<li><a href="#/categoria/${cat.slug}">${sanitizeText(cat.name)}</a></li>`
  ).join('');
  list.classList.add('categories-grid');
}

// Estado de la aplicación
let currentRoomIndex = null;
let currentHotspotData = null;
let currentResizeHandler = null; // Guardar referencia al handler de resize activo
let authToken = null; // Token JWT para autenticación
let currentUser = null; // Usuario actual autenticado
let allOrders = []; // Almacenar todos los pedidos para filtrado
let currentEditingRoom = null; // Sala actual en el editor de hotspots
let editingHotspots = []; // Hotspots en edición

/* ============================================================
   MENSAJES Y CONFIRMACIONES
   ============================================================ */
function showToast(message, tone = 'auto') {
  const region = document.getElementById('toast-region');
  if (!region || !message) return;
  const text = String(message);
  const isError = tone === 'error' || (tone === 'auto' && /error|no se pudo|inv[aá]lid|debes|credenciales/i.test(text));
  const toast = document.createElement('article');
  toast.className = `toast toast-${isError ? 'error' : 'success'}`;
  toast.innerHTML = `<span class="toast-icon">${isError ? '!' : '✓'}</span><div><strong>${isError ? 'Revisa la información' : 'Acción completada'}</strong><p>${sanitizeText(text)}</p></div><button type="button" aria-label="Cerrar mensaje">×</button>`;
  const close = () => { toast.classList.add('toast-leaving'); setTimeout(() => toast.remove(), 240); };
  toast.querySelector('button').addEventListener('click', close);
  region.appendChild(toast);
  setTimeout(close, 5200);
}

function requestConfirmation(message, confirmLabel = 'Sí, eliminar') {
  const modal = document.getElementById('action-confirm-modal');
  const messageElement = document.getElementById('action-confirm-message');
  const accept = document.getElementById('action-confirm-accept');
  if (!modal || !messageElement || !accept) return Promise.resolve(window.confirm(message));
  messageElement.textContent = message;
  accept.textContent = confirmLabel;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  return new Promise(resolve => {
    const finish = (answer) => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      accept.removeEventListener('click', approve);
      modal.querySelectorAll('[data-confirm-cancel]').forEach(item => item.removeEventListener('click', cancel));
      resolve(answer);
    };
    const approve = () => finish(true);
    const cancel = () => finish(false);
    accept.addEventListener('click', approve);
    modal.querySelectorAll('[data-confirm-cancel]').forEach(item => item.addEventListener('click', cancel));
  });
}

// Sustituye las alertas nativas por avisos discretos y coherentes con la interfaz.
window.alert = (message) => showToast(message);

// Detectar si es dispositivo móvil
const isMobile = () => {
  return window.innerWidth <= 760 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
};

// Función para sanitizar texto y prevenir XSS
function sanitizeText(text){
  if(typeof text !== 'string') return text;
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Aceptar únicamente URLs/rutas de imagen razonables antes de usarlas en estilos o atributos.
function sanitizeImageUrl(value){
  const url = String(value || '').trim();
  if(/^https?:\/\//i.test(url) || /^\/[^\/]/.test(url) || /^images\//i.test(url) || /^data:image\//i.test(url)) return url.replace(/[\"'<>]/g, '');
  return '';
}

// Sube una imagen seleccionada por el administrador y devuelve su URL pública.
async function uploadImageFile(file){
  if(!file) return '';
  if(file.size > 6 * 1024 * 1024) throw new Error('La imagen no puede superar 6 MB.');
  if(!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type)) throw new Error('Formato de imagen no permitido.');
  const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
  const response = await fetch('/api/uploads/image', { method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${authToken}`}, body:JSON.stringify({dataUrl, fileName:file.name}) });
  const data = await response.json();
  if(!response.ok) throw new Error(data.error || 'No se pudo subir la imagen.');
  return data.url;
}

// Función para validar email
function validateEmail(email){
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Función para validar contraseña (mínimo 8 caracteres)
function validatePassword(password){
  return password && password.length >= 8;
}

// Función para mostrar error de validación
function showValidationError(elementId, message){
  const errorElement = document.getElementById(elementId);
  if(errorElement){
    errorElement.textContent = message;
    errorElement.style.display = 'block';
  }
}

// Función para limpiar errores de validación
function clearValidationError(elementId){
  const errorElement = document.getElementById(elementId);
  if(errorElement){
    errorElement.textContent = '';
    errorElement.style.display = 'none';
  }
}

// Calcular el rectángulo real de la imagen dentro del contenedor (letterbox rect)
function getImageRect(imgElement, containerElement){
  const imgRatio = imgElement.naturalWidth / imgElement.naturalHeight;
  const containerRatio = containerElement.clientWidth / containerElement.clientHeight;

  let imageWidth, imageHeight, offsetX, offsetY;

  if(imgRatio > containerRatio){
    // La imagen es más ancha que el contenedor (letterbox arriba/abajo)
    imageWidth = containerElement.clientWidth;
    imageHeight = containerElement.clientWidth / imgRatio;
    offsetX = 0;
    offsetY = (containerElement.clientHeight - imageHeight) / 2;
  } else {
    // La imagen es más alta que el contenedor (letterbox izquierda/derecha)
    imageHeight = containerElement.clientHeight;
    imageWidth = containerElement.clientHeight * imgRatio;
    offsetX = (containerElement.clientWidth - imageWidth) / 2;
    offsetY = 0;
  }

  return { width: imageWidth, height: imageHeight, offsetX, offsetY };
}

// Elementos DOM
const views = {
  landing: document.getElementById('view-landing'),
  selector: document.getElementById('view-selector'),
  room: document.getElementById('view-room'),
  purchase: document.getElementById('view-purchase'),
  adminLogin: document.getElementById('view-admin-login'),
  forgotPassword: document.getElementById('view-forgot-password'),
  resetPassword: document.getElementById('view-reset-password'),
  clientRegister: document.getElementById('view-client-register'),
  adminDashboard: document.getElementById('view-admin-dashboard'),
  books: document.getElementById('view-books'),
  about: document.getElementById('view-about'),
  category: document.getElementById('view-category'),
  clientLogin: document.getElementById('view-client-login'),
  myOrders: document.getElementById('view-my-orders')
};

const elements = {
  categoriesToggle: document.getElementById('categories-toggle'),
  categoriesPanel: document.getElementById('categories-panel'),
  startExperience: document.getElementById('start-experience'),
  roomsGrid: document.getElementById('rooms-grid'),
  booksGrid: document.getElementById('books-grid'),
  roomImage: document.getElementById('room-image'),
  roomPhotoFrame: document.getElementById('room-photo-frame'),
  roomHotspots: document.getElementById('room-hotspots'),
  currentRoomName: document.getElementById('current-room-name'),
  backToSelector: document.getElementById('back-to-selector'),
  backToRoom: document.getElementById('back-to-room'),
  modalBackdrop: document.getElementById('modal-backdrop'),
  modalClose: document.getElementById('modal-close'),
  mBuyBtn: document.getElementById('m-buy-btn'),
  confirmPurchase: document.getElementById('confirm-purchase'),
  paymentOptions: document.getElementById('payment-options'),
  categoryTitle: document.getElementById('category-title'),
  categoryDescText: document.getElementById('category-desc-text'),
  categoryRoomTag: document.getElementById('category-room-tag'),
  categoryBackBtn: document.getElementById('category-back-btn'),
  // Elementos de administración
  adminLoginForm: document.getElementById('admin-login-form'),
  loginEmail: document.getElementById('login-email'),
  loginPassword: document.getElementById('login-password'),
  loginError: document.getElementById('login-error'),
  backToHome: document.getElementById('back-to-home'),
  adminLogout: document.getElementById('admin-account-logout'),
  statTotalOrders: document.getElementById('stat-total-orders'),
  statTotalRevenue: document.getElementById('stat-total-revenue'),
  statPendingOrders: document.getElementById('stat-pending-orders'),
  roomsList: document.getElementById('rooms-list'),
  booksList: document.getElementById('books-list'),
  categoriesList: document.getElementById('categories-list'),
  paymentMethodsList: document.getElementById('payment-methods-list'),
  ordersList: document.getElementById('orders-list'),
  // Elementos de cliente
  clientRegisterForm: document.getElementById('client-register-form'),
  registerName: document.getElementById('register-name'),
  registerEmail: document.getElementById('register-email'),
  registerPassword: document.getElementById('register-password'),
  registerPhone: document.getElementById('register-phone'),
  registerAddress: document.getElementById('register-address'),
  registerError: document.getElementById('register-error'),
  backToHomeFromRegister: document.getElementById('back-to-home-from-register'),
  clientLoginForm: document.getElementById('client-login-form'),
  clientLoginEmail: document.getElementById('client-login-email'),
  clientLoginPassword: document.getElementById('client-login-password'),
  clientLoginError: document.getElementById('client-login-error'),
  goToRegister: document.getElementById('go-to-register'),
  backToHomeFromClientLogin: document.getElementById('back-to-home-from-client-login'),
  // Elementos de pedidos
  backToHomeFromOrders: document.getElementById('back-to-home-from-orders'),
  ordersLoading: document.getElementById('orders-loading'),
  ordersEmpty: document.getElementById('orders-empty'),
  ordersListContainer: document.getElementById('orders-list-container'),
  goToSelectorFromOrders: document.getElementById('go-to-selector-from-orders')
};

// Función para generar gradiente desde paleta
function gradientFor(p){
  return `radial-gradient(120% 140% at 20% 15%, ${p[1]}, transparent 60%),
          radial-gradient(140% 160% at 80% 90%, ${p[0]}, transparent 65%),
          linear-gradient(160deg, ${p[2]}, ${p[0]})`;
}

// Obtener todas las salas combinadas (desde datos de API)
function getRoomDisplayName(room){
  if(/^Sala\s+/i.test(room.name || '')) return `Sala ${room.roomNumber}`;
  return room.name || `Sala ${room.roomNumber}`;
}

function getAllRooms(){
  const romanNumerals = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
  return roomsData.map((room, index) => ({
    id: room.id,
    name: room.name,
    theme: room.theme,
    image: room.imageUrl || '',
    type: room.type,
    roomNumber: romanNumerals[index] || String(index + 1),
    artworks: room.artworks || [],
    hotspots: room.type === 'PHOTO' ? (room.artworks || []).map(art => ({
      ...art, desc: art.description,
      left: art.hotspotLeft, top: art.hotspotTop, width: art.hotspotWidth, height: art.hotspotHeight
    })) : null
  }));
}

// Renderizar grid de libros
function renderBooks(){
  // Mostrar estado de carga
  elements.booksGrid.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Cargando libros...</div></div>';
  
  loadApiData().then(() => {
    elements.booksGrid.innerHTML = '';
    
    if (booksData.length === 0) {
      elements.booksGrid.innerHTML = '<div class="empty-message"><h2>No hay libros disponibles</h2><p>Pronto agregaremos nuevas publicaciones.</p></div>';
      return;
    }
    
    booksData.forEach((book, index) => {
      const card = document.createElement('div');
      card.className = 'book-card';
      
      const cover = document.createElement('div');
      cover.className = 'book-cover';
      // Usar gradiente por defecto ya que no tenemos palette en la API
      cover.style.backgroundImage = sanitizeImageUrl(book.coverUrl) ? `url("${sanitizeImageUrl(book.coverUrl)}")` : 'radial-gradient(120% 140% at 20% 15%, #c9a227, transparent 60%), radial-gradient(140% 160% at 80% 90%, #2a3d2e, transparent 65%), linear-gradient(160deg, #ede4dd, #2a3d2e)';
      cover.style.backgroundSize = 'cover';
      cover.style.backgroundPosition = 'center';
      
      const info = document.createElement('div');
      info.className = 'book-info';
      info.innerHTML = `
        <h3>${sanitizeText(book.title)}</h3>
        <div class="author">${sanitizeText(book.author)}</div>
        <div class="year">${sanitizeText(book.year)}</div>
        <div class="price">${sanitizeText(book.price)}</div>
      `;
      
      card.appendChild(cover);
      card.appendChild(info);
      
      card.addEventListener('click', () => {
        currentHotspotData = {...book, isBook: true};
        navigateToPurchase(book);
      });
      
      elements.booksGrid.appendChild(card);
    });
    
    // Aplicar grid layout
    elements.booksGrid.style.display = 'grid';
    elements.booksGrid.style.gridTemplateColumns = 'repeat(auto-fit, minmax(280px, 1fr))';
    elements.booksGrid.style.gap = '30px';
  }).catch(error => {
    console.error('Error al cargar libros:', error);
    elements.booksGrid.innerHTML = '<div class="empty-message"><h2>Error al cargar libros</h2><p>Por favor intenta nuevamente más tarde.</p></div>';
  });
}

/* ============================================================
   VISTA 1: Selector de Salas
   ============================================================ */

function renderRoomSelector(){
  // Mostrar estado de carga
  elements.roomsGrid.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Cargando salas...</div></div>';
  
  loadApiData().then(() => {
    elements.roomsGrid.innerHTML = '';
    
    if (roomsData.length === 0) {
      elements.roomsGrid.innerHTML = '<div class="empty-message"><h2>No hay salas disponibles</h2><p>Pronto agregaremos nuevas exhibiciones.</p></div>';
      return;
    }
    
    const allRooms = getAllRooms();

    allRooms.forEach((room, index) => {
      const card = document.createElement('div');
      card.className = 'room-card';
      card.onclick = () => navigateToRoom(index);
      

      card.innerHTML = `
        <div class="thumbnail"></div>
        <div class="card-body">
          <span class="card-num">${String(index + 1).padStart(2, '0')}</span>
          <h3 class="card-title">${sanitizeText(getRoomDisplayName(room))}</h3>
          <span class="card-theme">${sanitizeText(room.theme)}</span>
        </div>
      `;
      
      const thumbnail = card.querySelector('.thumbnail');
      if(room.image){ thumbnail.style.backgroundImage = `url("${sanitizeImageUrl(room.image)}")`; }
      else if(room.artworks && room.artworks.length > 0){ thumbnail.style.backgroundImage = gradientFor(room.artworks[0].palette || ['#1e3a5f','#3d6b8a','#eae4d3']); }
      else { thumbnail.style.background = 'linear-gradient(160deg, var(--wall-2), var(--wall-3))'; }
      elements.roomsGrid.appendChild(card);
    });
  }).catch(error => {
    console.error('Error al cargar salas:', error);
    elements.roomsGrid.innerHTML = '<div class="empty-message"><h2>Error al cargar salas</h2><p>Por favor intenta nuevamente más tarde.</p></div>';
  });
}

/* ============================================================
   VISTA 2: Sala en pantalla completa
   ============================================================ */

function navigateToRoom(index){
  currentRoomIndex = index;
  const allRooms = getAllRooms();
  const room = allRooms[index];

  // Actualizar nombre de sala
  elements.currentRoomName.textContent = getRoomDisplayName(room);

  // Actualizar imagen o lienzo de gradiente para salas sin fotografía.
  const safeRoomImage = sanitizeImageUrl(room.image);
  if(safeRoomImage){
    elements.roomImage.style.display = 'block';
    elements.roomImage.src = safeRoomImage;
    elements.roomPhotoFrame.style.background = '';
  } else {
    elements.roomImage.removeAttribute('src');
    elements.roomImage.style.display = 'none';
    elements.roomPhotoFrame.style.background = gradientFor(['#1e3a5f','#3d6b8a','#eae4d3']);
  }

  // Limpiar hotspots anteriores
  elements.roomHotspots.innerHTML = '';

  // Agregar mensaje indicativo para móvil
  if(isMobile()){
    const mobileHint = document.createElement('div');
    mobileHint.className = 'mobile-hint';
    mobileHint.textContent = 'Doble tap en los puntos para ver detalles';
    elements.roomHotspots.appendChild(mobileHint);
  }

  // Función para posicionar hotspots basado en el área real de la imagen
  function positionHotspots(){
    const imgRect = safeRoomImage && elements.roomImage.naturalWidth > 0 ? getImageRect(elements.roomImage, elements.roomPhotoFrame) : { width: elements.roomPhotoFrame.clientWidth, height: elements.roomPhotoFrame.clientHeight, offsetX: 0, offsetY: 0 };

    // Actualizar posición de hotspots existentes
    const hotspots = elements.roomHotspots.querySelectorAll('.hotspot');
    hotspots.forEach(btn => {
      const x = parseFloat(btn.dataset.x);
      const y = parseFloat(btn.dataset.y);
      const w = parseFloat(btn.dataset.w);
      const h = parseFloat(btn.dataset.h);

      if(!isNaN(x) && !isNaN(y)){
        // Convertir porcentajes a posición real basada en el área de la imagen
        const realLeft = imgRect.offsetX + (imgRect.width * x / 100);
        const realTop = imgRect.offsetY + (imgRect.height * y / 100);
        const realWidth = imgRect.width * w / 100;
        const realHeight = imgRect.height * h / 100;

        btn.style.left = realLeft + 'px';
        btn.style.top = realTop + 'px';
        btn.style.width = realWidth + 'px';
        btn.style.height = realHeight + 'px';
      }
    });
  }

  // Si tiene hotspots (PHOTO_SCENES), crear botones
  if(room.hotspots){
    room.hotspots.forEach((h, i) => {
      const btn = document.createElement('button');
      btn.className = 'hotspot';
      // Guardar coordenadas originales en porcentajes
      btn.dataset.x = h.left;
      btn.dataset.y = h.top;
      btn.dataset.w = h.width;
      btn.dataset.h = h.height;
      btn.setAttribute('aria-label', `${h.title} — ${h.price}`);

      btn.innerHTML = `
        <span class="dot"></span>
        <span class="tip">
          <span class="tip-title">${sanitizeText(h.title)}</span>
          <span class="tip-artist">${sanitizeText(h.artist)}, ${sanitizeText(h.year)}</span>
          <span class="tip-desc">${sanitizeText(h.desc)}</span>
          <span class="tip-price">${sanitizeText(h.price)}</span>
        </span>
      `;

      // En móvil: doble click, en desktop: click normal
      if(isMobile()){
        let lastClick = 0;
        btn.addEventListener('click', (e) => {
          const now = Date.now();
          const timeDiff = now - lastClick;

          if(timeDiff < 300 && timeDiff > 0){
            // Doble click detectado
            currentHotspotData = h;
            openModal(h);
            lastClick = 0;
          } else {
            // Primer click
            lastClick = now;
          }
        });
      } else {
        // Click normal en desktop
        btn.addEventListener('click', () => {
          currentHotspotData = h;
          openModal(h);
        });
      }

      elements.roomHotspots.appendChild(btn);
    });

    // Posicionar hotspots después de que la imagen cargue
    elements.roomImage.onload = () => {
      positionHotspots();
    };

    // Posicionar hotspots inmediatamente si la imagen ya está cargada
    if(elements.roomImage.complete){
      positionHotspots();
    }
  }

  // Si es sala de relleno (ROOMS), crear hotspots para cada artwork
  if(room.artworks && !room.hotspots){
    // Si una obra no tiene coordenadas, distribuirla automáticamente en una cuadrícula.
    const columns = Math.max(1, Math.ceil(Math.sqrt(room.artworks.length)));
    const cell = 100 / columns;

    room.artworks.forEach((art, ai) => {
      const btn = document.createElement('button');
      btn.className = 'hotspot';
      // Usar posición de cuadrícula o posición por defecto si hay más de 4 obras
      const row = Math.floor(ai / columns);
      const col = ai % columns;
      const pos = { x: col * cell + cell * 0.15, y: row * cell + cell * 0.15 };
      btn.dataset.x = art.hotspotLeft ?? pos.x;
      btn.dataset.y = art.hotspotTop ?? pos.y;
      btn.dataset.w = art.hotspotWidth ?? Math.min(cell * 0.7, 28);
      btn.dataset.h = art.hotspotHeight ?? Math.min(cell * 0.7, 28);
      btn.setAttribute('aria-label', `${art.title} — ${art.price}`);
      btn.dataset.artworkIndex = ai;

      btn.innerHTML = `
        <span class="dot"></span>
        <span class="tip">
          <span class="tip-title">${sanitizeText(art.title)}</span>
          <span class="tip-artist">${sanitizeText(art.artist)}, ${sanitizeText(art.year)}</span>
          <span class="tip-desc">${sanitizeText(art.desc)}</span>
          <span class="tip-price">${sanitizeText(art.price)}</span>
        </span>
      `;

      // En móvil: doble click, en desktop: click normal
      if(isMobile()){
        let lastClick = 0;
        btn.addEventListener('click', (e) => {
          const now = Date.now();
          const timeDiff = now - lastClick;

          if(timeDiff < 300 && timeDiff > 0){
            // Doble click detectado
            currentHotspotData = {...art, roomId: currentRoomIndex, artIndex: ai};
            openModal(art);
            lastClick = 0;
          } else {
            // Primer click
            lastClick = now;
          }
        });
      } else {
        // Click normal en desktop
        btn.addEventListener('click', () => {
          currentHotspotData = {...art, roomId: currentRoomIndex, artIndex: ai};
          openModal(art);
        });
      }

      elements.roomHotspots.appendChild(btn);
    });

    // Posicionar hotspots después de que la imagen cargue
    elements.roomImage.onload = () => {
      positionHotspots();
    };

    // Posicionar hotspots inmediatamente si la imagen ya está cargada
    if(elements.roomImage.complete){
      positionHotspots();
    }
  }

  // Cambiar vista con animación
  switchView('room', index);

  // Remover listener de resize anterior si existe
  if(currentResizeHandler){
    window.removeEventListener('resize', currentResizeHandler);
  }

  // Guardar referencia al nuevo handler y agregarlo
  currentResizeHandler = positionHotspots;
  window.addEventListener('resize', currentResizeHandler);
}

/* ============================================================
   VISTA 6: Página de Categoría
   ============================================================ */

async function navigateToCategory(categoryId){
  elements.categoryDescText.textContent = 'Cargando...';
  try {
    await loadApiData();
    const category = categoriesData.find(cat => cat.slug === categoryId);
    if(!category){ switchView('selector'); return; }
    elements.categoryTitle.textContent = category.name;
    elements.categoryDescText.textContent = category.description || '';
    elements.categoryRoomTag.textContent = category.name;
    const grid = document.getElementById('category-artworks-grid');
    const statusSection = document.getElementById('category-status');
    if(statusSection) statusSection.style.display = (category.artworks || []).length ? 'none' : 'block';
    if(grid){
      grid.innerHTML = '';
      const artworks = category.artworks || [];
      if(artworks.length){
        artworks.forEach(art => {
          const card = document.createElement('article');
          card.className = 'category-artwork-card';
          card.innerHTML = `<h3>${sanitizeText(art.title)}</h3><p>${sanitizeText(art.artist)} · ${sanitizeText(art.year)}</p><strong>${sanitizeText(art.price)}</strong>`;
          card.addEventListener('click', () => { currentHotspotData = {...art, desc: art.description, roomId: roomsData.findIndex(r => r.id === art.roomId)}; navigateToPurchase(currentHotspotData); });
          grid.appendChild(card);
        });
      } else {
        grid.innerHTML = '<p class="no-data">Aún no hay obras asociadas a esta categoría.</p>';
      }
    }
    switchView('category');
  } catch(error) {
    console.error(error);
    elements.categoryDescText.textContent = 'No fue posible cargar esta categoría.';
    switchView('category');
  }
}

/* ============================================================
   VISTA 3: Detalle de Compra
   ============================================================ */

function navigateToPurchase(data){
  // Verificar si hay sesión iniciada
  authToken = localStorage.getItem('authToken');
  currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  
  if (!authToken || !currentUser) {
    // Guardar el item pendiente para redirigir después del login
    localStorage.setItem('pendingPurchase', JSON.stringify(data));
    
    // Redirigir a login
    alert('Debes iniciar sesión para completar tu compra');
    switchView('clientLogin');
    return;
  }
  
  // Determinar si es libro o obra
  const isBook = data.isBook || false;
  
  // Llenar datos
  document.getElementById('purchase-eyebrow').textContent = isBook 
    ? 'Publicación'
    : (data.roomId !== undefined 
      ? `Sala ${(getAllRooms()[data.roomId]?.roomNumber || (data.roomId + 1))} · Obra ${data.id}` 
      : `${data.artist} · ${data.year}`);
  
  document.getElementById('purchase-title').textContent = data.title;
  document.getElementById('purchase-artist').textContent = isBook 
    ? `${data.author} · ${data.year}`
    : `${data.artist}, ${data.year}`;
  document.getElementById('purchase-year').textContent = data.year;
  document.getElementById('purchase-medium').textContent = isBook ? 'Libro/Catálogo' : data.medium;
  document.getElementById('purchase-dims').textContent = isBook ? 'Varía según edición' : data.dims;
  document.getElementById('purchase-avail').textContent = data.status === 'SOLD' ? 'Vendida' : data.status === 'RESERVED' ? 'Reservada' : 'Disponible';
  document.getElementById('purchase-desc').textContent = data.desc || data.description || '';
  if(data.status === 'SOLD' || data.status === 'RESERVED'){ elements.confirmPurchase.disabled = true; elements.confirmPurchase.textContent = data.status === 'SOLD' ? 'Obra vendida' : 'Obra reservada'; } else { elements.confirmPurchase.disabled = false; elements.confirmPurchase.textContent = 'Confirmar interés'; }
  document.getElementById('purchase-price').textContent = data.price;
  
  // Configurar visual
  const canvas = document.getElementById('purchase-canvas');
  const safeImage = sanitizeImageUrl(data.image || data.coverUrl);
  if(safeImage){
    canvas.style.backgroundImage = `url("${safeImage}")`;
  } else if(data.palette){
    canvas.style.backgroundImage = gradientFor(data.palette);
  } else {
    canvas.style.backgroundImage = 'linear-gradient(160deg, rgba(201,162,39,0.22), rgba(20,26,22,0.9))';
  }
  canvas.style.backgroundSize = 'cover';
  canvas.style.backgroundPosition = 'center';
  
  // Renderizar opciones de pago
  renderPaymentOptions();
  
  // Cambiar vista
  switchView('purchase');
}

function renderPaymentOptions(){
  elements.paymentOptions.innerHTML = '';
  
  const methods = paymentMethodsData.length ? paymentMethodsData : [];
  methods.forEach(method => {
    const option = document.createElement('div');
    option.className = 'payment-option';
    option.innerHTML = `
      <input type="radio" name="payment" id="payment-${method.id}" value="${method.id}">
      <label for="payment-${method.id}">${sanitizeText(method.icon)} ${sanitizeText(method.label)}</label>
    `;
    
    option.onclick = () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
    };
    
    elements.paymentOptions.appendChild(option);
  });
}

async function confirmPurchaseInterest(){
  // Una compra no puede completarse sin sesión, incluso al volver con el historial.
  if (!authToken || !currentUser) {
    if (currentHotspotData) localStorage.setItem('pendingPurchase', JSON.stringify(currentHotspotData));
    showToast('Inicia sesión o crea una cuenta para continuar con la compra.', 'error');
    switchView('clientLogin');
    return;
  }
  const selectedPayment = document.querySelector('input[name="payment"]:checked');
  const methods = paymentMethodsData;
  const method = selectedPayment 
    ? methods.find(m => m.id === selectedPayment.value)
    : null;
  
  if (!method) {
    alert('Por favor selecciona un método de pago.');
    return;
  }
  
  if (!currentHotspotData) {
    alert('Error: no hay item seleccionado para comprar.');
    return;
  }
  
  try {
    // Determinar itemType y itemId
    const itemType = currentHotspotData.isBook ? 'BOOK' : 'ARTWORK';
    const itemId = currentHotspotData.id;
    
    // Llamar a la API para crear el pedido
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        itemType,
        itemId,
        paymentMethod: method.id
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al crear pedido');
    }
    
    // Mostrar modal de confirmación
    const folio = data.id.slice(0, 8);
    document.getElementById('confirmation-folio').textContent = folio;
    document.getElementById('confirmation-payment').textContent = method.label;
    
    const modal = document.getElementById('confirmation-modal');
    modal.style.display = 'flex';
    
    // Animación de entrada
    gsap.fromTo(modal.querySelector('.confirmation-modal-content'),
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
    );
  } catch (error) {
    console.error('Error al crear pedido:', error);
    alert(error.message || 'Error al crear el pedido. Por favor intenta nuevamente.');
  }
}

/* ============================================================
   Sistema de Navegación entre Vistas
   ============================================================ */

function switchView(viewName, roomIndex = null){
  const isAdminView = ['adminDashboard', 'adminLogin', 'forgotPassword', 'resetPassword'].includes(viewName);
  document.body.classList.toggle('admin-mode', isAdminView);
  document.body.classList.toggle('immersive-room', viewName === 'room');
  // Asegurar que el panel de cuenta del admin nunca quede abierto al cambiar de vista
  if(typeof toggleAdminAccountPanel === 'function') toggleAdminAccountPanel(false);
  if(viewName !== 'room') elements.categoriesPanel?.classList.remove('open');
  
  // Banner de vista previa cuando el administrador explora el sitio público
  const previewBanner = document.getElementById('admin-preview-banner');
  const isClientPreview = !isAdminView && currentUser && currentUser.role === 'ADMIN';
  document.body.classList.toggle('has-admin-preview', isClientPreview);
  if (previewBanner) {
    previewBanner.style.display = isClientPreview ? 'flex' : 'none';
  }

  // Ocultar todas las vistas
  Object.values(views).forEach(v => {
    if(v){
      v.style.display = 'none';
      v.style.opacity = '0';
    }
  });
  
  // Mostrar vista seleccionada con animación
  const targetView = views[viewName];
  if(!targetView) return;
  targetView.style.display = 'block';
  
  gsap.fromTo(targetView, 
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }
  );
  
  // Actualizar URL hash
  if(viewName === 'landing'){
    history.pushState(null, '', '#/');
  } else if(viewName === 'selector'){
    history.pushState(null, '', '#/selector');
  } else if(viewName === 'adminDashboard'){
    history.pushState(null, '', '#admin-dashboard');
  } else if(viewName === 'room' && roomIndex !== null){
    history.pushState(null, '', `#/sala/${roomIndex}`);
  } else if(viewName === 'purchase' && currentHotspotData){
    const roomId = currentHotspotData.roomId !== undefined ? currentHotspotData.roomId : currentRoomIndex;
    const artId = currentHotspotData.id;
    history.pushState(null, '', `#/obra/${roomId}/${artId}`);
  }
  
  // Actualizar estado activo en menú
  updateActiveNavLink();
  
  // Scroll al top
  window.scrollTo(0, 0);
}

function handleHashChange(){
  const hash = window.location.hash;

  if(hash === '#/' || hash === ''){
    switchView('landing');
  } else if(hash === '#/selector'){
    renderRoomSelector();
    switchView('selector');
  } else if(hash === '#/libros'){
    renderBooks();
    switchView('books');
  } else if(hash === '#/nosotros'){
    loadAboutContent();
    switchView('about');
  } else if(hash === '#admin-login'){
    switchView('adminLogin');
  } else if(hash === '#admin-dashboard' || hash.startsWith('#admin-dashboard?')){
    authToken = localStorage.getItem('authToken');
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    if(!authToken || !currentUser || currentUser.role !== 'ADMIN'){
      switchView('adminLogin');
    } else {
      switchView('adminDashboard');
      loadAdminDashboard();
      const urlParams = new URLSearchParams(hash.split('?')[1] || '');
      const tab = urlParams.get('tab');
      if(tab) switchAdminTab(tab);
    }
  } else if(hash === '#forgot-password'){
    switchView('forgotPassword');
  } else if(hash === '#reset-password'){
    switchView('resetPassword');
  } else if(hash === '#client-register'){
    switchView('clientRegister');
  } else if(hash === '#client-login'){
    switchView('clientLogin');
  } else if(hash === '#my-orders'){
    switchView('myOrders');
    loadMyOrders();
  } else if(hash.startsWith('#/categoria/')){
    const categoryId = hash.split('/')[2];
    navigateToCategory(categoryId);
  } else if(hash.startsWith('#/sala/')){
    const index = parseInt(hash.split('/')[2]);
    if(!isNaN(index) && index >= 0 && index < getAllRooms().length){
      navigateToRoom(index);
    }
  } else if(hash.startsWith('#/obra/')){
    const parts = hash.split('/');
    const roomId = parseInt(parts[2]);
    const artId = parts[3];

    if(!isNaN(roomId)){
      const allRooms = getAllRooms();
      const room = allRooms[roomId];

      if(room){
        let artwork = null;
        if(room.hotspots){
          artwork = room.hotspots.find(h => h.id === artId);
        } else if(room.artworks){
          artwork = room.artworks.find(a => a.id === artId);
        }

        if(artwork){
          currentHotspotData = {...artwork, roomId: roomId};
          navigateToPurchase(artwork);
        }
      }
    }
  } else if(hash.startsWith('#/libro/')){
    const bookId = hash.split('/')[2];
    loadApiData().then(() => {
      const book = booksData.find(b => b.id === bookId);
      if(book){ currentHotspotData = {...book, isBook: true}; navigateToPurchase(currentHotspotData); }
      else switchView('books');
    }).catch(() => switchView('books'));
  }
  
  // Actualizar estado activo en menú
  updateActiveNavLink();
}

async function loadAboutContent(){
  try {
    const response = await fetch('/api/about');
    if(!response.ok) throw new Error('Error al cargar información');
    const data = await response.json();
    if(!data) return;
    const root = document.getElementById('about-text');
    if(!root) return;
    const blocks = root.querySelectorAll('.about-block');
    if(blocks[0]){ blocks[0].querySelector('h2').textContent = data.title || 'BALAM'; blocks[0].querySelectorAll('p')[0].textContent = data.description || ''; if(blocks[0].querySelectorAll('p')[1]) blocks[0].querySelectorAll('p')[1].textContent = 'Explora nuestra colección virtual y conoce nuestras exhibiciones.'; }
    const contact = root.querySelector('.contact-info');
    if(contact){ const values = contact.querySelectorAll('.contact-value'); [data.address,data.hours,data.email,data.phone].forEach((v,i)=>{ if(values[i]) values[i].textContent = v || 'No disponible'; }); }
  } catch(error){ console.error(error); }
}

function updateActiveNavLink(){
  const hash = window.location.hash;

  // Remover clase active de todos los links
  document.querySelectorAll('.nav-main-links a').forEach(a => {
    a.classList.remove('active');
  });
  
  // Determinar cuál link debe estar activo
  let activeNav = 'landing';
  if(hash === '#/selector' || hash.startsWith('#/sala/') || hash.startsWith('#/obra/')){
    activeNav = 'collections';
  } else if(hash === '#/libros' || hash.startsWith('#/libro/')){
    activeNav = 'books';
  } else if(hash === '#/nosotros'){
    activeNav = 'about';
  }
  
  // Agregar clase active al link correspondiente
  const activeLink = document.querySelector(`.nav-main-links a[data-nav="${activeNav}"]`);
  if(activeLink){
    activeLink.classList.add('active');
  }
}

/* ============================================================
   Modal (Tooltip rápido)
   ============================================================ */

function openModal(data){
  // Llenar datos del modal
  document.getElementById('m-canvas').style.backgroundImage = data.palette
    ? gradientFor(data.palette)
    : 'linear-gradient(160deg, rgba(201,162,39,0.22), rgba(20,26,22,0.9))';
  document.getElementById('m-canvas').style.backgroundSize = 'cover';
  document.getElementById('m-canvas').style.backgroundPosition = 'center';
  
  document.getElementById('m-eyebrow').textContent = `${data.artist} · ${data.year}`;
  document.getElementById('m-title').textContent = data.title;
  document.getElementById('m-artist').textContent = `${data.artist}, ${data.year}`;
  document.getElementById('m-year').textContent = data.year;
  document.getElementById('m-medium').textContent = data.medium;
  document.getElementById('m-dims').textContent = data.dims;
  document.getElementById('m-desc').textContent = data.desc;
  document.getElementById('m-price').textContent = data.price;
  
  elements.modalBackdrop.classList.add('open');
  gsap.fromTo(elements.modalBackdrop, 
    { opacity: 0 }, 
    { opacity: 1, duration: 0.35, ease: 'power2.out' }
  );
  gsap.fromTo('#modal', 
    { y: 24, opacity: 0 }, 
    { y: 0, opacity: 1, duration: 0.45, ease: 'power3.out' }
  );
  document.body.style.overflow = 'hidden';
}

function closeModal(){
  gsap.to(elements.modalBackdrop, {
    opacity: 0,
    duration: 0.25,
    ease: 'power2.in',
    onComplete: () => {
      elements.modalBackdrop.classList.remove('open');
      document.body.style.overflow = '';
    }
  });
}

/* ============================================================
   Event Listeners
   ============================================================ */

// Panel desplegable de categorías
let isPanelOpen = false;

function toggleCategoriesPanel(){
  isPanelOpen = !isPanelOpen;

  if(isPanelOpen){
    // Abrir panel con animación GSAP
    elements.categoriesToggle.classList.add('active');
    gsap.to(elements.categoriesPanel, {
      height: 'auto',
      duration: 0.35,
      ease: 'power2.out'
    });
  } else {
    // Cerrar panel con animación GSAP
    elements.categoriesToggle.classList.remove('active');
    gsap.to(elements.categoriesPanel, {
      height: 0,
      duration: 0.3,
      ease: 'power2.in'
    });
  }
}

function closeCategoriesPanel(){
  if(isPanelOpen){
    isPanelOpen = false;
    elements.categoriesToggle.classList.remove('active');
    gsap.to(elements.categoriesPanel, {
      height: 0,
      duration: 0.3,
      ease: 'power2.in'
    });
  }
}

// Click en botón de categorías
elements.categoriesToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleCategoriesPanel();
});

// Click fuera del panel para cerrar
document.addEventListener('click', (e) => {
  if(isPanelOpen && !elements.categoriesPanel.contains(e.target) && !elements.categoriesToggle.contains(e.target)){
    closeCategoriesPanel();
  }
});

// Tecla ESC para cerrar panel
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape' && isPanelOpen){
    closeCategoriesPanel();
  }
});

// Click en links del panel para cerrar
document.querySelectorAll('.panel-column-links a').forEach(link => {
  link.addEventListener('click', () => {
    closeCategoriesPanel();
  });
});

// Ajustar posición de tooltips para que no se salgan de pantalla
function adjustTooltipPosition(hotspot, tooltip){
  const hotspotRect = hotspot.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const margin = 16;

  // Verificar si el tooltip se sale por la derecha
  if(hotspotRect.right + tooltipRect.width + margin > viewportWidth){
    // Invertir posición horizontal
    tooltip.style.left = 'auto';
    tooltip.style.right = '0';
    tooltip.style.transform = 'translate(50%, 6px)';
  } else {
    // Mantener posición normal
    tooltip.style.left = '50%';
    tooltip.style.right = 'auto';
    tooltip.style.transform = 'translate(-50%, 6px)';
  }

  // Verificar si el tooltip se sale por la izquierda
  if(hotspotRect.left - tooltipRect.width - margin < 0){
    tooltip.style.left = '50%';
    tooltip.style.right = 'auto';
    tooltip.style.transform = 'translate(-50%, 6px)';
  }

  // Verificar si el tooltip se sale por arriba (ya existe lógica con tip-below)
  if(hotspotRect.top - tooltipRect.height - margin < 0){
    hotspot.classList.add('tip-below');
  } else {
    hotspot.classList.remove('tip-below');
  }
}

// Aplicar ajuste de tooltip al hacer hover en hotspots
document.addEventListener('mouseover', (e) => {
  const hotspot = e.target.closest('.hotspot');
  if(hotspot){
    const tooltip = hotspot.querySelector('.tip');
    if(tooltip){
      adjustTooltipPosition(hotspot, tooltip);
    }
  }
});

// Navegación
elements.startExperience.addEventListener('click', () => {
  renderRoomSelector();
  switchView('selector');
});

elements.backToSelector.addEventListener('click', () => switchView('selector'));
elements.backToRoom.addEventListener('click', () => {
  if(currentRoomIndex !== null){
    navigateToRoom(currentRoomIndex);
  } else if(currentHotspotData && currentHotspotData.isBook){
    switchView('books');
  } else {
    switchView('selector');
  }
});

// Botón volver en vista de categoría
elements.categoryBackBtn.addEventListener('click', () => switchView('selector'));

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN
   ============================================================ */

let currentAdminTab = 'overview';
let allArtworksCache = [];

// Función para cambiar de pestaña en el ecosistema de administración
function switchAdminTab(tabName){
  currentAdminTab = tabName;
  document.querySelectorAll('.admin-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.admin-tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `admin-tab-${tabName}`);
  });
  
  if(tabName === 'overview') {
    loadBillingSummary();
  } else if(tabName === 'rooms') {
    loadRoomsList();
  } else if(tabName === 'artworks') {
    loadArtworksAdminList();
  } else if(tabName === 'books') {
    loadBooksList();
  } else if(tabName === 'categories') {
    loadCategoriesList();
  } else if(tabName === 'payments') {
    loadPaymentMethodsList();
  } else if(tabName === 'orders') {
    loadOrdersList(allOrders);
    loadSalesHistory();
  } else if(tabName === 'about') {
    loadAboutAdminPreview();
  } else if(tabName === 'hotspots') {
    loadRoomsForTabHotspotEditor();
  }
}

// Función para iniciar sesión como administrador
async function adminLogin(email, password){
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }
    if(data.user.role !== 'ADMIN'){
      throw new Error('Esta cuenta no tiene permisos de administrador.');
    }

    // Guardar token y usuario
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));

    elements.loginError.style.display = 'none';
    
    // Redirigir al dashboard y cargar sus datos antes de notificar éxito.
    switchView('adminDashboard');
    await loadAdminDashboard();
    showToast(`Bienvenido, ${data.user.name}. Ecosistema de administración listo.`);
  } catch (error) {
    showValidationError('login-error', error.message);
    showToast(error.message, 'error');
  }
}

// Función para cargar el dashboard de administración
async function loadAdminDashboard(){
  if (!authToken) {
    switchView('adminLogin');
    return;
  }

  // Actualizar datos del perfil en el header
  if(currentUser){
    const profileName = document.getElementById('admin-profile-name');
    const profileEmail = document.getElementById('admin-profile-email');
    if(profileName) profileName.textContent = currentUser.name || 'Administrador';
    if(profileEmail) profileEmail.textContent = currentUser.email || 'admin@balam.gt';
    populateAdminAccountPanel();
  }

  try {
    const response = await fetch('/api/admin/dashboard', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al cargar dashboard');
    }

    // Actualizar estadísticas del mes
    if(elements.statTotalOrders) elements.statTotalOrders.textContent = data.monthOrders;
    if(elements.statTotalRevenue) elements.statTotalRevenue.textContent = Number(data.monthRevenue || 0).toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 });
    if(elements.statPendingOrders) elements.statPendingOrders.textContent = data.ordersByStatus.find(s => s.status === 'PENDING')?._count?._all || 0;

    // Cargar facturación y resumen
    loadBillingSummary();

    // Almacenar pedidos para filtrado
    const allOrdersResponse = await fetch('/api/orders?all=1', { headers: { Authorization: `Bearer ${authToken}` } });
    allOrders = allOrdersResponse.ok ? await allOrdersResponse.json() : (data.recentOrders || []);

    // Cargar la pestaña activa
    switchAdminTab(currentAdminTab);
  } catch (error) {
    console.error('Error al cargar dashboard:', error);
    if(error.message.includes('Sesión') || error.message.includes('Token') || error.message.includes('inválid')){ 
      adminLogout(); 
    } else { 
      alert(error.message || 'Error al cargar dashboard'); 
    }
  }
}

async function loadBillingSummary(){
  const container = document.getElementById('billing-summary');
  const period = document.getElementById('billing-period');
  if (!container) return;
  try {
    const response = await fetch('/api/admin/billing', { headers: { Authorization: `Bearer ${authToken}` } });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo cargar la facturación.');
    const money = (value) => Number(value || 0).toLocaleString('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 });
    const date = new Date(data.period.start);
    if (period) period.textContent = date.toLocaleDateString('es-GT', { month: 'long', year: 'numeric' });
    const customers = data.totals.customers || 0;
    const customersStat = document.getElementById('stat-month-customers');
    if (customersStat) customersStat.textContent = customers;
    const paymentRows = data.byPaymentMethod.length ? data.byPaymentMethod.map(row => `
      <div class="billing-row"><span>${sanitizeText(row.paymentMethod)}</span><strong>${money(row._sum.priceAmount)}</strong><small>${row._count._all} venta${row._count._all === 1 ? '' : 's'}</small></div>`).join('') : '<p class="admin-empty-state">Aún no hay cobros confirmados este mes.</p>';
    const itemRows = data.byItemType.map(row => `<span class="billing-chip">${row.itemType === 'ARTWORK' ? 'Obras' : 'Libros'} · ${row._count._all}</span>`).join('') || '<span class="billing-chip">Sin ventas</span>';
    container.innerHTML = `
      <div class="billing-total"><span>Ingresos cobrados</span><strong>${money(data.totals.revenue)}</strong><p>${data.totals.paidOrders} venta${data.totals.paidOrders === 1 ? '' : 's'} confirmada${data.totals.paidOrders === 1 ? '' : 's'} · ${data.totals.allMonthOrders} pedido${data.totals.allMonthOrders === 1 ? '' : 's'} registrado${data.totals.allMonthOrders === 1 ? '' : 's'}</p></div>
      <div class="billing-breakdown"><h3>Por método de pago</h3>${paymentRows}</div>
      <div class="billing-items"><h3>Ventas por catálogo</h3><div>${itemRows}</div><p>${customers} cliente${customers === 1 ? '' : 's'} atendido${customers === 1 ? '' : 's'} este mes.</p></div>`;
  } catch (error) {
    container.innerHTML = `<p class="admin-empty-state">${sanitizeText(error.message)}</p>`;
  }
}

// Función para cargar lista de salas en formato de tarjetas enriquecidas
async function loadRoomsList(){
  try {
    const response = await fetch('/api/rooms');
    const rooms = await response.json();

    if(!elements.roomsList) return;

    if(!rooms || rooms.length === 0){
      elements.roomsList.innerHTML = '<div class="empty-message" style="grid-column:1/-1;"><h2>No hay salas creadas</h2><p>Comienza creando la primera sala de exhibición.</p><button onclick="openAddRoomModal()" class="admin-btn primary">+ Crear Sala</button></div>';
      return;
    }

    elements.roomsList.innerHTML = rooms.map(room => {
      const count = (room.artworks || []).length;
      const bgStyle = room.imageUrl 
        ? `background-image:url('${sanitizeImageUrl(room.imageUrl)}');` 
        : 'background:linear-gradient(160deg,var(--wall-2),var(--wall-3));';
      
      return `
        <article class="admin-room-card">
          <div class="room-card-preview" style="${bgStyle}">
            <span class="room-badge-type">${room.type === 'PHOTO' ? '📷 FOTO' : '🎨 GRADIENTE'} · Orden ${room.order}</span>
          </div>
          <div class="room-card-body">
            <h3>${sanitizeText(room.name)}</h3>
            <p><strong>Tema:</strong> ${sanitizeText(room.theme)}</p>
            <p><span class="billing-chip" style="margin:0;">${count} obra${count === 1 ? '' : 's'} vinculada${count === 1 ? '' : 's'}</span></p>
          </div>
          <div class="room-card-footer">
            <div class="admin-list-item-actions">
              <button onclick="editRoom('${room.id}')" class="small-btn">Editar</button>
              <button onclick="deleteRoom('${room.id}')" class="small-btn danger">Eliminar</button>
            </div>
            <button onclick="switchAdminTab('artworks'); document.getElementById('artwork-room-filter').value='${room.id}'; loadArtworksAdminList({roomId:'${room.id}'});" class="small-btn">Ver Obras →</button>
          </div>
        </article>
      `;
    }).join('');
  } catch (error) {
    console.error('Error al cargar salas:', error);
    if(elements.roomsList) elements.roomsList.innerHTML = '<p class="error">Error al cargar las salas.</p>';
  }
}

// Función para cargar catálogo completo de obras de arte con filtros
async function loadArtworksAdminList(filters = {}){
  const container = document.getElementById('artworks-admin-list');
  const roomFilterSelect = document.getElementById('artwork-room-filter');
  if(!container) return;
  
  container.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Cargando catálogo de obras...</div></div>';
  
  try {
    const [roomsRes, categoriesRes] = await Promise.all([
      fetch('/api/rooms'),
      fetch('/api/categories')
    ]);
    const rooms = await roomsRes.json();
    const categories = await categoriesRes.json();
    
    // Poblar select de salas en los filtros (siempre actualizado con las salas existentes)
    if(roomFilterSelect){
      const currentVal = roomFilterSelect.value;
      roomFilterSelect.innerHTML = '<option value="">Todas las salas</option>' + rooms.map(r => `<option value="${r.id}">${sanitizeText(r.name)} - ${sanitizeText(r.theme)}</option>`).join('');
      if(currentVal) roomFilterSelect.value = currentVal;
    }
    
    // Aplanar todas las obras con sus metadatos
    const artworks = [];
    rooms.forEach(r => {
      (r.artworks || []).forEach(art => {
        const category = categories.find(c => c.id === art.categoryId);
        artworks.push({
          ...art,
          roomName: r.name,
          roomTheme: r.theme,
          roomImageUrl: r.imageUrl,
          categoryName: category ? category.name : 'Sin categoría'
        });
      });
    });
    
    allArtworksCache = artworks;
    
    // Aplicar filtros
    const searchQuery = (filters.search !== undefined ? filters.search : document.getElementById('artwork-search-filter')?.value || '').toLowerCase().trim();
    const roomFilter = filters.roomId !== undefined ? filters.roomId : document.getElementById('artwork-room-filter')?.value || '';
    const statusFilter = filters.status !== undefined ? filters.status : document.getElementById('artwork-status-filter')?.value || '';
    
    let filtered = artworks.filter(art => {
      if(searchQuery && !art.title.toLowerCase().includes(searchQuery) && !art.artist.toLowerCase().includes(searchQuery)) return false;
      if(roomFilter && art.roomId !== roomFilter) return false;
      if(statusFilter && art.status !== statusFilter) return false;
      return true;
    });
    
    if(filtered.length === 0){
      container.innerHTML = '<div class="empty-message"><h2>No se encontraron obras</h2><p>No hay obras que coincidan con los filtros seleccionados o el catálogo está vacío.</p><button onclick="openAddArtworkModal()" class="admin-btn primary">+ Agregar Primera Obra</button></div>';
      return;
    }
    
    const statusLabels = {
      AVAILABLE: '<span class="status-badge available">Disponible</span>',
      RESERVED: '<span class="status-badge reserved">Reservada</span>',
      SOLD: '<span class="status-badge sold">Vendida</span>'
    };
    
    container.innerHTML = `
      <table class="artworks-table">
        <thead>
          <tr>
            <th style="width:70px;">Visual</th>
            <th>Obra & Artista</th>
            <th>Sala</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Estado</th>
            <th>Hotspot</th>
            <th style="text-align:right;">Acciones</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(art => `
            <tr>
              <td>
                <div class="art-thumb-cell" style="${art.hotspotLeft !== null && art.roomImageUrl ? `background-image:url('${sanitizeImageUrl(art.roomImageUrl)}');` : (art.palette ? `background:${gradientFor(art.palette)};` : 'background:linear-gradient(160deg,var(--wall-2),var(--wall-3));')}"></div>
              </td>
              <td class="art-title-cell">
                <strong>${sanitizeText(art.title)}</strong>
                <small>${sanitizeText(art.artist)} · ${sanitizeText(art.year)} ${art.medium ? `· ${sanitizeText(art.medium)}` : ''}</small>
              </td>
              <td>${sanitizeText(art.roomName)}</td>
              <td><span class="billing-chip" style="margin:0;">${sanitizeText(art.categoryName)}</span></td>
              <td><strong>${sanitizeText(art.price)}</strong></td>
              <td>${statusLabels[art.status] || art.status}</td>
              <td>
                ${art.hotspotLeft !== null ? `<span style="color:var(--brass-soft); font-size:12px;">✓ (${art.hotspotLeft}%, ${art.hotspotTop}%)</span>` : '<span style="color:var(--stone); font-size:12px;">Sin ubicar</span>'}
              </td>
              <td style="text-align:right;">
                <div class="admin-list-item-actions" style="justify-content:flex-end;">
                  <button onclick="editArtwork('${art.id}')" class="small-btn">Editar</button>
                  <button onclick="deleteArtwork('${art.id}')" class="small-btn danger">Eliminar</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error al cargar obras:', error);
    container.innerHTML = '<div class="empty-message"><h2>Error al cargar obras</h2><p>' + sanitizeText(error.message) + '</p></div>';
  }
}

// Función para cargar lista de libros
async function loadBooksList(){
  try {
    const response = await fetch('/api/books');
    const books = await response.json();

    if(!elements.booksList) return;

    if(!books || books.length === 0){
      elements.booksList.innerHTML = '<div class="empty-message" style="grid-column:1/-1;"><h2>No hay libros registrados</h2><p>Agrega catálogos de arte o monografías.</p><button onclick="openAddBookModal()" class="admin-btn primary">+ Agregar Libro</button></div>';
      return;
    }

    elements.booksList.innerHTML = books.map(book => {
      const coverStyle = book.coverUrl ? `background-image:url('${sanitizeImageUrl(book.coverUrl)}');` : 'background:linear-gradient(160deg, #c9a227, #152019);';
      return `
        <article class="admin-book-card">
          <div class="admin-book-cover" style="${coverStyle}"></div>
          <div class="admin-book-body">
            <h3>${sanitizeText(book.title)}</h3>
            <div class="author">${sanitizeText(book.author)} (${sanitizeText(book.year)})</div>
            <div class="price">${sanitizeText(book.price)}</div>
          </div>
          <div class="room-card-footer">
            <div class="admin-list-item-actions">
              <button onclick="editBook('${book.id}')" class="small-btn">Editar</button>
              <button onclick="deleteBook('${book.id}')" class="small-btn danger">Eliminar</button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  } catch (error) {
    console.error('Error al cargar libros:', error);
    if(elements.booksList) elements.booksList.innerHTML = '<p class="error">Error al cargar libros.</p>';
  }
}

// Función para cargar lista de categorías
async function loadCategoriesList(){
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();

    // Actualizar datos del cliente para que el panel del nav se refresque
    categoriesData = categories || [];
    renderCategoriesPanel();

    if(!elements.categoriesList) return;

    if(!categories || categories.length === 0){
      elements.categoriesList.innerHTML = '<div class="empty-message" style="grid-column:1/-1;"><h2>No hay categorías</h2><p>Crea categorías para organizar tus obras de arte.</p><button onclick="openAddCategoryModal()" class="admin-btn primary">+ Crear Categoría</button></div>';
      return;
    }

    elements.categoriesList.innerHTML = categories.map(cat => `
      <article class="admin-category-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
          <h3>${sanitizeText(cat.name)}</h3>
          <span class="preview-badge" style="font-size:10px;">${cat.slug}</span>
        </div>
        <p>${sanitizeText(cat.description || 'Sin descripción.')}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:auto; padding-top:12px; border-top:1px solid var(--line);">
          <span class="billing-chip" style="margin:0;">${(cat.artworks || []).length} obras vinculadas</span>
          <div class="admin-list-item-actions">
            <button onclick="openCategorySection('${cat.slug}')" class="small-btn">Ver sección</button>
            <button onclick="editCategory('${cat.slug}')" class="small-btn">Editar</button>
            <button onclick="deleteCategory('${cat.slug}')" class="small-btn danger">Eliminar</button>
          </div>
        </div>
      </article>
    `).join('');
  } catch (error) {
    console.error('Error al cargar categorías:', error);
    if(elements.categoriesList) elements.categoriesList.innerHTML = '<p class="error">Error al cargar categorías.</p>';
  }
}

// Función para cargar lista de métodos de pago
async function loadPaymentMethodsList(){
  try {
    const response = await fetch('/api/payment-methods?all=1', { headers: { 'Authorization': `Bearer ${authToken}` } });
    const paymentMethods = await response.json();

    if(!elements.paymentMethodsList) return;

    if(!paymentMethods || paymentMethods.length === 0){
      elements.paymentMethodsList.innerHTML = '<div class="empty-message" style="grid-column:1/-1;"><h2>No hay métodos de pago</h2><p>Configura los métodos de pago aceptados en la galería.</p><button onclick="openAddPaymentMethodModal()" class="admin-btn primary">+ Crear Método</button></div>';
      return;
    }

    elements.paymentMethodsList.innerHTML = paymentMethods.map(method => `
      <article class="admin-payment-card">
        <div class="payment-card-main">
          <span class="payment-card-icon">${sanitizeText(method.icon)}</span>
          <div class="payment-card-info">
            <strong>${sanitizeText(method.label)}</strong>
            <small style="color:${method.active ? '#79c58b' : '#f28b9c'};">${method.active ? '● Activo en checkout' : '○ Desactivado'}</small>
          </div>
        </div>
        <div class="admin-list-item-actions">
          <button onclick="togglePaymentMethodActive('${method.id}', ${!method.active})" class="small-btn">${method.active ? 'Desactivar' : 'Activar'}</button>
          <button onclick="editPaymentMethod('${method.id}')" class="small-btn">Editar</button>
          <button onclick="deletePaymentMethod('${method.id}')" class="small-btn danger">Eliminar</button>
        </div>
      </article>
    `).join('');
  } catch (error) {
    console.error('Error al cargar métodos de pago:', error);
    if(elements.paymentMethodsList) elements.paymentMethodsList.innerHTML = '<p class="error">Error al cargar métodos de pago.</p>';
  }
}

// Activar o desactivar método de pago rápidamente
window.togglePaymentMethodActive = async function(id, newActiveState) {
  try {
    const methodRes = await fetch(`/api/payment-methods?all=1`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    const methods = await methodRes.json();
    const current = methods.find(m => m.id === id);
    if (!current) throw new Error('Método de pago no encontrado');

    const response = await fetch(`/api/payment-methods/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        label: current.label,
        icon: current.icon,
        active: newActiveState
      })
    });

    if (!response.ok) throw new Error('No se pudo actualizar el método de pago.');
    loadPaymentMethodsList();
    showToast(`Método de pago ${newActiveState ? 'activado' : 'desactivado'}.`);
  } catch (error) {
    showToast(error.message, 'error');
  }
};

// Cargar vista previa de Acerca de Nosotros
async function loadAboutAdminPreview(){
  const container = document.getElementById('about-admin-preview');
  if(!container) return;
  try {
    const response = await fetch('/api/about');
    const data = await response.json();
    if(!data) {
      container.innerHTML = '<p class="admin-empty-state">No hay información cargada.</p>';
      return;
    }
    container.innerHTML = `
      <div class="about-admin-section">
        <h3>${sanitizeText(data.title || 'BALAM')}</h3>
        <p>${sanitizeText(data.description || 'Sin descripción institucional.')}</p>
      </div>
      <div class="about-admin-contacts">
        <div class="about-contact-field">
          <span>Dirección Física</span>
          <strong>${sanitizeText(data.address || 'No definida')}</strong>
        </div>
        <div class="about-contact-field">
          <span>Horario de Atención</span>
          <strong>${sanitizeText(data.hours || 'No definido')}</strong>
        </div>
        <div class="about-contact-field">
          <span>Correo Electrónico</span>
          <strong>${sanitizeText(data.email || 'No definido')}</strong>
        </div>
        <div class="about-contact-field">
          <span>Teléfono de Contacto</span>
          <strong>${sanitizeText(data.phone || 'No definido')}</strong>
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Error al cargar vista previa de Acerca de:', error);
    container.innerHTML = '<p class="error">Error al cargar información institucional.</p>';
  }
}

// Función para cargar histórico de ventas
async function loadSalesHistory(){
  try {
    const response = await fetch('/api/admin/sales-by-month', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const salesData = await response.json();

    const content = document.getElementById('sales-history-content');
    if (!content) return;
    
    if (!salesData || salesData.length === 0) {
      content.innerHTML = '<p class="no-data">No hay datos de ventas disponibles.</p>';
      return;
    }

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    
    content.innerHTML = `
      <table class="sales-table">
        <thead>
          <tr>
            <th>Mes</th>
            <th>Pedidos Cobrados</th>
            <th>Ingresos Totales</th>
          </tr>
        </thead>
        <tbody>
          ${salesData.map(sale => {
            const date = new Date(sale.month);
            const monthName = monthNames[date.getMonth()];
            const year = date.getFullYear();
            const revenue = sale.total_revenue ? parseInt(sale.total_revenue).toLocaleString('es-GT', { style: 'currency', currency: 'GTQ' }) : 'Q0';
            
            return `
              <tr>
                <td><strong>${monthName} ${year}</strong></td>
                <td>${sale.order_count}</td>
                <td><strong style="color:var(--brass-soft);">${revenue}</strong></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  } catch (error) {
    console.error('Error al cargar histórico de ventas:', error);
    const content = document.getElementById('sales-history-content');
    if(content) content.innerHTML = '<p class="error">Error al cargar datos de ventas.</p>';
  }
}

// Función para cargar lista de pedidos
function loadOrdersList(orders, filters = {}){
  const { status, dateFrom, dateTo } = filters;
  
  let filteredOrders = orders || [];
  
  if (status) {
    filteredOrders = filteredOrders.filter(order => order.status === status);
  }
  
  if (dateFrom) {
    const fromDate = new Date(dateFrom);
    filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) >= fromDate);
  }
  
  if (dateTo) {
    const toDate = new Date(dateTo);
    toDate.setHours(23, 59, 59, 999);
    filteredOrders = filteredOrders.filter(order => new Date(order.createdAt) <= toDate);
  }
  
  const container = document.getElementById('orders-list');
  if (!container) return;

  if (filteredOrders.length === 0) {
    container.innerHTML = '<div class="empty-message"><h2>No se encontraron pedidos</h2><p>No hay pedidos que coincidan con los filtros seleccionados.</p></div>';
    return;
  }
  
  const statusLabels = {
    'PENDING': 'Pendiente',
    'CONFIRMED': 'Confirmado',
    'PAID': 'Pagado',
    'DELIVERED': 'Entregado',
    'CANCELLED': 'Cancelado'
  };
  const statusClasses = {
    'PENDING': 'pending',
    'CONFIRMED': 'confirmed',
    'PAID': 'paid',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled'
  };

  container.innerHTML = filteredOrders.map(order => {
    const item = order.artwork || order.book;
    const itemType = order.artwork ? 'Obra de arte' : 'Publicación / Libro';
    return `
      <div class="order-card" style="margin-bottom:16px;">
        <div class="order-header">
          <div>
            <strong style="color:var(--ivory); font-size:14px;">Pedido #${order.id.slice(0, 8)}</strong>
            <div style="font-size:12px; color:var(--stone); margin-top:2px;">Cliente: ${sanitizeText(order.user?.name || 'Cliente')} (${sanitizeText(order.user?.email || 'N/A')})</div>
          </div>
          <span class="status-badge ${statusClasses[order.status] || ''}">${statusLabels[order.status] || order.status}</span>
        </div>
        <div class="order-body">
          <div>
            <span class="order-item-type">${itemType}</span>
            <div class="order-item-title" style="margin-top:2px;">${sanitizeText(item?.title || 'Artículo de galería')}</div>
            <div class="order-item-artist">${sanitizeText(item?.artist || item?.author || '')}</div>
          </div>
          <div>
            <div class="order-price">${sanitizeText(order.priceAtPurchase)}</div>
            <div class="order-date">${new Date(order.createdAt).toLocaleDateString('es-GT', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
            <div style="font-size:11px; color:var(--stone); text-align:right; margin-top:4px;">Pago: ${sanitizeText(order.paymentMethod)}</div>
          </div>
        </div>
        <div style="margin-top:14px; padding-top:12px; border-top:1px solid var(--line); display:flex; justify-content:flex-end;">
          <button onclick="viewOrder('${order.id}')" class="admin-btn">Ver Detalle & Cambiar Estado</button>
        </div>
      </div>
    `;
  }).join('');
}

// Función para cerrar sesión del administrador
function adminLogout(){
  authToken = null;
  currentUser = null;
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  document.body.classList.remove('admin-mode', 'has-admin-preview');
  const previewBanner = document.getElementById('admin-preview-banner');
  if(previewBanner) previewBanner.style.display = 'none';
  switchView('landing');
  showToast('Has cerrado la sesión de administración.');
}

// Event listener para formulario de login de administrador
elements.adminLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  elements.loginError.textContent = '';
  
  const email = elements.loginEmail.value;
  const password = elements.loginPassword.value;
  
  if (!validateEmail(email)) {
    showValidationError('login-error', 'Por favor ingresa un email válido');
    return;
  }
  
  if (!validatePassword(password)) {
    showValidationError('login-error', 'La contraseña debe tener al menos 8 caracteres');
    return;
  }
  
  adminLogin(email, password);
});

// Event listener para volver al home desde login
elements.backToHome.addEventListener('click', () => switchView('landing'));

// Verificar si hay sesión guardada al cargar
window.addEventListener('load', async () => {
  const savedToken = localStorage.getItem('authToken');
  const savedUser = localStorage.getItem('currentUser');
  if(savedToken && savedUser){
    try {
      const response = await fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${savedToken}` } });
      if(!response.ok) throw new Error('Sesión inválida');
      const data = await response.json();
      authToken = savedToken;
      currentUser = data.user;
      localStorage.setItem('currentUser', JSON.stringify(data.user));
    } catch(_) {
      authToken = null; currentUser = null;
      localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
    }
  }
});

/* ============================================================
   FUNCIONES DE CLIENTE
   ============================================================ */

// Función para registrar cliente
async function clientRegister(name, email, password, phone, address){
  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, email, password, phone, address })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al registrarse');
    }

    // Guardar token y usuario
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));

    elements.registerError.style.display = 'none';
    if(typeof refreshClientAccount === 'function') refreshClientAccount();
    const pendingPurchase = localStorage.getItem('pendingPurchase');
    if (pendingPurchase) {
      localStorage.removeItem('pendingPurchase');
      navigateToPurchase(JSON.parse(pendingPurchase));
    } else {
      switchView('landing');
    }
    showToast('Cuenta creada correctamente. Ya puedes continuar.');
  } catch (error) {
    showValidationError('register-error', error.message);
    showToast(error.message, 'error');
  }
}

// Función para iniciar sesión como cliente
async function clientLogin(email, password){
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    // Guardar token y usuario
    authToken = data.token;
    currentUser = data.user;
    localStorage.setItem('authToken', data.token);
    localStorage.setItem('currentUser', JSON.stringify(data.user));

    elements.clientLoginError.style.display = 'none';
    // Actualizar el panel de cuenta del cliente
    if(typeof refreshClientAccount === 'function') refreshClientAccount();
    // Verificar si hay un item pendiente de compra
    const pendingPurchase = localStorage.getItem('pendingPurchase');
    if (pendingPurchase) {
      localStorage.removeItem('pendingPurchase');
      const item = JSON.parse(pendingPurchase);
      navigateToPurchase(item);
    } else {
      // Redirigir a la vista anterior o landing
      switchView('landing');
    }
    showToast('Sesión iniciada. Puedes explorar o continuar tu compra.');
  } catch (error) {
    showValidationError('client-login-error', error.message);
    showToast(error.message, 'error');
  }
}

// Event listener para formulario de registro de cliente
elements.clientRegisterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  elements.registerError.textContent = '';
  
  const name = elements.registerName.value;
  const email = elements.registerEmail.value;
  const password = elements.registerPassword.value;
  const phone = elements.registerPhone.value;
  const address = elements.registerAddress.value;
  
  if (!name || name.trim().length < 2) {
    showValidationError('register-error', 'Por favor ingresa tu nombre completo');
    return;
  }
  
  if (!validateEmail(email)) {
    showValidationError('register-error', 'Por favor ingresa un email válido');
    return;
  }
  
  if (!validatePassword(password)) {
    showValidationError('register-error', 'La contraseña debe tener al menos 8 caracteres');
    return;
  }
  
  clientRegister(name, email, password, phone, address);
});

// Event listener para formulario de login de cliente
elements.clientLoginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  elements.clientLoginError.textContent = '';
  
  const email = elements.clientLoginEmail.value;
  const password = elements.clientLoginPassword.value;
  
  if (!validateEmail(email)) {
    showValidationError('client-login-error', 'Por favor ingresa un email válido');
    return;
  }
  
  if (!validatePassword(password)) {
    showValidationError('client-login-error', 'La contraseña debe tener al menos 8 caracteres');
    return;
  }
  
  clientLogin(email, password);
});

// Event listeners para navegación entre login y registro
elements.backToHomeFromRegister.addEventListener('click', () => switchView('landing'));
elements.backToHomeFromClientLogin.addEventListener('click', () => switchView('landing'));
elements.goToRegister.addEventListener('click', () => {
  elements.clientLoginError.textContent = '';
  switchView('clientRegister');
});

/* ============================================================
   FUNCIONES DE RECUPERACIÓN DE CONTRASEÑA
   ============================================================ */

// Event listener para formulario de forgot-password
document.getElementById('forgot-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const email = document.getElementById('forgot-email').value;
  const messageElement = document.getElementById('forgot-password-message');
  
  messageElement.style.display = 'none';
  messageElement.textContent = '';
  messageElement.className = 'login-message';
  
  try {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });
    
    const data = await response.json();
    
    messageElement.style.display = 'block';
    messageElement.textContent = data.message;
    messageElement.classList.add('success');
    
    // En desarrollo, mostrar el token
    if (data.resetToken) {
      console.log('Token de reset:', data.resetToken);
      messageElement.textContent += ' Token: ' + data.resetToken;
    }
  } catch (error) {
    console.error('Error al solicitar reset:', error);
    messageElement.style.display = 'block';
    messageElement.textContent = 'Error al solicitar recuperación de contraseña';
    messageElement.classList.add('error');
  }
});

// Event listener para formulario de reset-password
document.getElementById('reset-password-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const password = document.getElementById('reset-password').value;
  const confirmPassword = document.getElementById('reset-password-confirm').value;
  const messageElement = document.getElementById('reset-password-message');
  
  messageElement.style.display = 'none';
  messageElement.textContent = '';
  messageElement.className = 'login-message';
  
  if (password !== confirmPassword) {
    messageElement.style.display = 'block';
    messageElement.textContent = 'Las contraseñas no coinciden';
    messageElement.classList.add('error');
    return;
  }
  
  if (!validatePassword(password)) {
    messageElement.style.display = 'block';
    messageElement.textContent = 'La contraseña debe tener al menos 8 caracteres';
    messageElement.classList.add('error');
    return;
  }
  
  // Obtener token de la URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  if (!token) {
    messageElement.style.display = 'block';
    messageElement.textContent = 'Token no proporcionado. Por favor usa el enlace del email.';
    messageElement.classList.add('error');
    return;
  }
  
  try {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token, newPassword: password })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Error al resetear contraseña');
    }
    
    messageElement.style.display = 'block';
    messageElement.textContent = data.message;
    messageElement.classList.add('success');
    
    // Redirigir al login después de 2 segundos
    setTimeout(() => {
      window.location.hash = '#admin-login';
    }, 2000);
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    messageElement.style.display = 'block';
    messageElement.textContent = error.message || 'Error al resetear contraseña';
    messageElement.classList.add('error');
  }
});

// Event listeners para botones de navegación
document.getElementById('back-to-login').addEventListener('click', () => {
  window.location.hash = '#admin-login';
});

document.getElementById('back-to-login-from-reset').addEventListener('click', () => {
  window.location.hash = '#admin-login';
});

document.getElementById('forgot-password-link').addEventListener('click', (e) => {
  e.preventDefault();
  window.location.hash = '#forgot-password';
});

/* ============================================================
   FUNCIONES DE PEDIDOS
   ============================================================ */

// Función para cargar pedidos del cliente
async function loadMyOrders(){
  if (!authToken) {
    switchView('clientLogin');
    return;
  }

  elements.ordersLoading.style.display = 'block';
  elements.ordersLoading.innerHTML = '<div class="loading-container"><div class="loading-spinner"></div><div class="loading-text">Cargando pedidos...</div></div>';
  elements.ordersEmpty.style.display = 'none';
  elements.ordersListContainer.style.display = 'none';

  try {
    const response = await fetch('/api/orders', {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const orders = await response.json();

    if (!response.ok) {
      throw new Error(orders.error || 'Error al cargar pedidos');
    }

    elements.ordersLoading.style.display = 'none';

    if (orders.length === 0) {
      elements.ordersEmpty.style.display = 'block';
    } else {
      elements.ordersListContainer.style.display = 'block';
      renderOrdersList(orders);
    }
  } catch (error) {
    console.error('Error al cargar pedidos:', error);
    elements.ordersLoading.style.display = 'none';
    elements.ordersEmpty.innerHTML = `<h2>Error al cargar pedidos</h2><p>${error.message}</p>`;
    elements.ordersEmpty.style.display = 'block';
  }
}

// Función para renderizar lista de pedidos
function renderOrdersList(orders){
  elements.ordersListContainer.innerHTML = orders.map(order => {
    const item = order.artwork || order.book;
    const itemType = order.artwork ? 'Obra' : 'Libro';
    const statusLabels = {
      'PENDING': 'Pendiente',
      'CONFIRMED': 'Confirmado',
      'PAID': 'Pagado',
      'CANCELLED': 'Cancelado',
      'DELIVERED': 'Entregado'
    };
    const statusColors = {
      'PENDING': '#c9a227',
      'CONFIRMED': '#3d6b8a',
      'PAID': '#2a3d2e',
      'CANCELLED': '#8a3b2b',
      'DELIVERED': '#3d6b8a'
    };

    return `
      <div class="order-card">
        <div class="order-header">
          <div class="order-id">Pedido #${order.id.slice(0, 8)}</div>
          <div class="order-status" style="color: ${statusColors[order.status] || '#c9a227'}">
            ${statusLabels[order.status] || order.status}
          </div>
        </div>
        <div class="order-body">
          <div class="order-item-type">${itemType}</div>
          <div class="order-item-title">${sanitizeText(item?.title || 'N/A')}</div>
          <div class="order-item-artist">${sanitizeText(item?.artist || item?.author || 'N/A')}</div>
          <div class="order-price">${sanitizeText(order.priceAtPurchase)}</div>
          <div class="order-date">${new Date(order.createdAt).toLocaleDateString('es-GT')}</div>
        </div>
      </div>
    `;
  }).join('');
}

// Event listeners para navegación de pedidos
elements.backToHomeFromOrders.addEventListener('click', () => switchView('landing'));
elements.goToSelectorFromOrders.addEventListener('click', () => switchView('selector'));

// Modal
elements.modalClose.addEventListener('click', closeModal);
elements.modalBackdrop.addEventListener('click', (e) => {
  if(e.target === elements.modalBackdrop) closeModal();
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') closeModal();
});

// Compra desde modal
elements.mBuyBtn.addEventListener('click', () => {
  if(currentHotspotData){
    closeModal();
    setTimeout(() => navigateToPurchase(currentHotspotData), 300);
  }
});

elements.confirmPurchase.addEventListener('click', confirmPurchaseInterest);

// Event listener para cerrar modal de confirmación
document.getElementById('confirmation-modal-close').addEventListener('click', () => {
  const modal = document.getElementById('confirmation-modal');
  
  // Animación de salida
  gsap.to(modal.querySelector('.confirmation-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
      // Redirigir a Mis Compras
      loadMyOrders();
      switchView('myOrders');
    }
  });
});

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - MODALES
   ============================================================ */

// Función para abrir modal de agregar sala
function openAddRoomModal() {
  const modal = document.getElementById('add-room-modal');
  document.getElementById('room-modal-title').textContent = 'Agregar Nueva Sala';
  document.getElementById('room-id').value = '';
  document.getElementById('add-room-form').reset();
  modal.style.display = 'flex';
  
  gsap.fromTo(modal.querySelector('.admin-modal-content'),
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
  );
}

// Función para cerrar modal de agregar sala
function closeAddRoomModal() {
  const modal = document.getElementById('add-room-modal');
  
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
      document.getElementById('add-room-form').reset();
    }
  });
}

window.editRoom = async function(roomId){
  try {
    const response = await fetch(`/api/rooms/${roomId}`);
    const room = await response.json();
    if(!response.ok) throw new Error(room.error || 'No se pudo cargar la sala.');
    document.getElementById('room-modal-title').textContent = 'Editar Sala';
    document.getElementById('room-id').value = room.id;
    document.getElementById('room-name').value = room.name || '';
    document.getElementById('room-theme').value = room.theme || '';
    document.getElementById('room-type').value = room.type || 'GRADIENT';
    document.getElementById('room-image-url').value = room.imageUrl || '';
    document.getElementById('room-order').value = room.order ?? 0;
    document.getElementById('room-image-file').value = '';
    const modal = document.getElementById('add-room-modal');
    modal.style.display='flex';
  } catch(error){ alert(error.message); }
};

window.deleteRoom = async function(roomId){
  if(!(await requestConfirmation('¿Deseas eliminar esta sala? Esta acción no se puede deshacer.'))) return;
  try {
    const response = await fetch(`/api/rooms/${roomId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || 'No se pudo eliminar la sala.');
    loadRoomsList();
    loadArtworksAdminList();
    alert('Sala eliminada exitosamente.');
  } catch(error){ alert(error.message); }
};

// Función para abrir modal de agregar libro
function openAddBookModal() {
  const modal = document.getElementById('add-book-modal');
  document.getElementById('book-modal-title').textContent = 'Agregar Nuevo Libro';
  document.getElementById('book-id').value = '';
  document.getElementById('add-book-form').reset();
  modal.style.display = 'flex';
  
  gsap.fromTo(modal.querySelector('.admin-modal-content'),
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
  );
}

// Función para cerrar modal de agregar libro
function closeAddBookModal() {
  const modal = document.getElementById('add-book-modal');
  
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
      document.getElementById('add-book-form').reset();
    }
  });
}

// Event listeners para botones de agregar sala y libro
document.getElementById('add-room-btn').addEventListener('click', openAddRoomModal);
document.getElementById('cancel-add-room').addEventListener('click', closeAddRoomModal);
document.getElementById('add-book-btn').addEventListener('click', openAddBookModal);
document.getElementById('cancel-add-book').addEventListener('click', closeAddBookModal);
document.getElementById('add-artwork-btn').addEventListener('click', openAddArtworkModal);

// Event listener para formulario de agregar sala
document.getElementById('add-room-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  delete data['room-image-file'];
  try {
    const uploaded = await uploadImageFile(document.getElementById('room-image-file').files[0]);
    if(uploaded) data.imageUrl = uploaded;
    data.order = Number(data.order) || 0;
    const roomId = document.getElementById('room-id').value;
    const isEdit = Boolean(roomId);
    const response = await fetch(isEdit ? `/api/rooms/${roomId}` : '/api/rooms', {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear sala');
    }
    
    closeAddRoomModal();
    loadRoomsList();
    alert(isEdit ? 'Sala actualizada exitosamente' : 'Sala creada exitosamente');
  } catch (error) {
    console.error('Error al crear sala:', error);
    alert(error.message || 'Error al crear la sala');
  }
});

// Event listener para formulario de agregar libro
document.getElementById('add-book-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  delete data['book-cover-file'];
  try {
    const uploaded = await uploadImageFile(document.getElementById('book-cover-file').files[0]);
    if(uploaded) data.coverUrl = uploaded;
    const bookId = document.getElementById('book-id').value;
    const isEdit = Boolean(bookId);
    const response = await fetch(isEdit ? `/api/books/${bookId}` : '/api/books', {
      method: isEdit ? 'PUT' : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear libro');
    }
    
    closeAddBookModal();
    loadBooksList();
    alert(isEdit ? 'Libro actualizado exitosamente' : 'Libro creado exitosamente');
  } catch (error) {
    console.error('Error al crear libro:', error);
    alert(error.message || 'Error al crear el libro');
  }
});

window.editBook = async function(bookId){
  try {
    const response = await fetch(`/api/books/${bookId}`);
    const book = await response.json();
    if(!response.ok) throw new Error(book.error || 'No se pudo cargar el libro.');
    document.getElementById('book-modal-title').textContent='Editar Libro';
    document.getElementById('book-id').value=book.id;
    document.getElementById('book-title').value=book.title || '';
    document.getElementById('book-author').value=book.author || '';
    document.getElementById('book-year').value=book.year || '';
    document.getElementById('book-price').value=book.price || '';
    document.getElementById('book-description').value=book.description || '';
    document.getElementById('book-cover').value=book.coverUrl || '';
    document.getElementById('book-cover-file').value='';
    const modal=document.getElementById('add-book-modal'); modal.style.display='flex';
  } catch(error){ alert(error.message); }
};

window.deleteBook = async function(bookId){
  if(!(await requestConfirmation('¿Deseas eliminar este libro? Esta acción no se puede deshacer.'))) return;
  try {
    const response=await fetch(`/api/books/${bookId}`,{method:'DELETE',headers:{Authorization:`Bearer ${authToken}`}});
    const data=await response.json(); if(!response.ok) throw new Error(data.error || 'No se pudo eliminar el libro.');
    await loadBooksList(); alert('Libro eliminado exitosamente.');
  } catch(error){ alert(error.message); }
};

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - CRUD DE OBRAS
   ============================================================ */

// Función para cargar salas en el select del modal de obras
async function loadRoomsSelect() {
  try {
    const response = await fetch('/api/rooms');
    const rooms = await response.json();
    
    const select = document.getElementById('artwork-room');
    select.innerHTML = rooms.map(room => 
      `<option value="${room.id}">${sanitizeText(room.name)} - ${sanitizeText(room.theme)}</option>`
    ).join('');
  } catch (error) {
    console.error('Error al cargar salas:', error);
  }
}

// Función para cargar categorías en el select del modal de obras
async function loadCategoriesSelect() {
  try {
    const response = await fetch('/api/categories');
    const categories = await response.json();
    
    const select = document.getElementById('artwork-category');
    select.innerHTML = '<option value="">Sin categoría</option>' + 
      categories.map(cat => 
        `<option value="${cat.id}">${sanitizeText(cat.name)}</option>`
      ).join('');
  } catch (error) {
    console.error('Error al cargar categorías:', error);
  }
}

// Función para abrir modal de agregar obra
function openAddArtworkModal() {
  const modal = document.getElementById('add-artwork-modal');
  document.getElementById('artwork-modal-title').textContent = 'Agregar Nueva Obra';
  document.getElementById('artwork-id').value = '';
  document.getElementById('add-artwork-form').reset();
  
  loadRoomsSelect();
  loadCategoriesSelect();
  
  modal.style.display = 'flex';
  
  gsap.fromTo(modal.querySelector('.admin-modal-content'),
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
  );
}

// Función para cerrar modal de agregar obra
function closeAddArtworkModal() {
  const modal = document.getElementById('add-artwork-modal');
  
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
      document.getElementById('add-artwork-form').reset();
    }
  });
}

// Event listener para formulario de agregar obra
document.getElementById('add-artwork-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  const artworkId = document.getElementById('artwork-id').value;
  
  // Convertir valores numéricos
  if (data.hotspotLeft) data.hotspotLeft = parseFloat(data.hotspotLeft);
  if (data.hotspotTop) data.hotspotTop = parseFloat(data.hotspotTop);
  if (data.hotspotWidth) data.hotspotWidth = parseFloat(data.hotspotWidth);
  if (data.hotspotHeight) data.hotspotHeight = parseFloat(data.hotspotHeight);
  
  // Si no hay ID, es una creación nueva
  const isEdit = !!artworkId;
  const url = isEdit ? `/api/artworks/${artworkId}` : '/api/artworks';
  const method = isEdit ? 'PUT' : 'POST';
  
  // Si es edición, no enviar el ID en el body
  if (isEdit) {
    delete data.id;
  }
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar obra');
    }
    
    closeAddArtworkModal();
    alert(isEdit ? 'Obra actualizada exitosamente' : 'Obra creada exitosamente');
    
    // Recargar la lista de salas y el catálogo de obras
    loadRoomsList();
    loadArtworksAdminList();
  } catch (error) {
    console.error('Error al guardar obra:', error);
    alert(error.message || 'Error al guardar la obra');
  }
});

// Event listeners para botones de agregar obra
document.getElementById('cancel-add-artwork').addEventListener('click', closeAddArtworkModal);

// Función para editar obra
window.editArtwork = async function(artworkId) {
  try {
    const response = await fetch(`/api/artworks/${artworkId}`);
    const artwork = await response.json();
    
    if (!response.ok) {
      throw new Error('Error al cargar obra');
    }
    
    // Llenar el formulario con los datos de la obra
    document.getElementById('artwork-modal-title').textContent = 'Editar Obra';
    document.getElementById('artwork-id').value = artwork.id;
    document.getElementById('artwork-room').value = artwork.roomId;
    document.getElementById('artwork-title').value = artwork.title;
    document.getElementById('artwork-artist').value = artwork.artist;
    document.getElementById('artwork-year').value = artwork.year;
    document.getElementById('artwork-medium').value = artwork.medium || '';
    document.getElementById('artwork-dims').value = artwork.dims || '';
    document.getElementById('artwork-price').value = artwork.price;
    document.getElementById('artwork-description').value = artwork.description || '';
    document.getElementById('artwork-category').value = artwork.categoryId || '';
    document.getElementById('artwork-status').value = artwork.status || 'AVAILABLE';
    document.getElementById('artwork-hotspot-left').value = artwork.hotspotLeft || '';
    document.getElementById('artwork-hotspot-top').value = artwork.hotspotTop || '';
    document.getElementById('artwork-hotspot-width').value = artwork.hotspotWidth || '';
    document.getElementById('artwork-hotspot-height').value = artwork.hotspotHeight || '';
    
    loadRoomsSelect();
    loadCategoriesSelect();
    
    const modal = document.getElementById('add-artwork-modal');
    modal.style.display = 'flex';
    
    gsap.fromTo(modal.querySelector('.admin-modal-content'),
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
    );
  } catch (error) {
    console.error('Error al cargar obra:', error);
    alert('Error al cargar la obra');
  }
};

// Función para eliminar obra
window.deleteArtwork = async function(artworkId) {
  if (!(await requestConfirmation('¿Deseas eliminar esta obra? Esta acción no se puede deshacer.'))) {
    return;
  }
  
  try {
    const response = await fetch(`/api/artworks/${artworkId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar obra');
    }
    
    alert('Obra eliminada exitosamente');
    loadRoomsList();
    loadArtworksAdminList();
  } catch (error) {
    console.error('Error al eliminar obra:', error);
    alert(error.message || 'Error al eliminar la obra');
  }
};

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - CRUD DE CATEGORÍAS
   ============================================================ */

// Función para abrir modal de agregar categoría
function openAddCategoryModal() {
  const modal = document.getElementById('add-category-modal');
  document.getElementById('category-modal-title').textContent = 'Agregar Nueva Categoría';
  document.getElementById('category-slug').value = '';
  document.getElementById('add-category-form').reset();
  document.getElementById('category-public-slug').value = '';
  document.getElementById('category-public-slug').dataset.manuallyEdited = '';
  
  modal.style.display = 'flex';
  
  gsap.fromTo(modal.querySelector('.admin-modal-content'),
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
  );
}

// Función para cerrar modal de agregar categoría
function closeAddCategoryModal() {
  const modal = document.getElementById('add-category-modal');
  
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
      document.getElementById('add-category-form').reset();
    }
  });
}

// Función para editar categoría
window.editCategory = async function(categorySlug) {
  try {
    const response = await fetch(`/api/categories/${categorySlug}`);
    const category = await response.json();
    
    if (!response.ok) {
      throw new Error('Error al cargar categoría');
    }
    
    // Llenar el formulario con los datos de la categoría
    document.getElementById('category-modal-title').textContent = 'Editar Categoría';
    document.getElementById('category-slug').value = category.slug;
    document.getElementById('category-name').value = category.name;
    document.getElementById('category-public-slug').value = category.slug;
    document.getElementById('category-public-slug').dataset.manuallyEdited = 'true';
    document.getElementById('category-description').value = category.description || '';
    
    const modal = document.getElementById('add-category-modal');
    modal.style.display = 'flex';
    
    gsap.fromTo(modal.querySelector('.admin-modal-content'),
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
    );
  } catch (error) {
    console.error('Error al cargar categoría:', error);
    alert('Error al cargar la categoría');
  }
};

window.openCategorySection = function(categorySlug) {
  window.location.hash = `#/categoria/${categorySlug}`;
};

function categorySlugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Función para eliminar categoría
window.deleteCategory = async function(categorySlug) {
  if (!(await requestConfirmation('¿Deseas eliminar esta categoría? Las obras quedarán sin categoría.'))) {
    return;
  }
  
  try {
    const response = await fetch(`/api/categories/${categorySlug}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar categoría');
    }
    
    alert('Categoría eliminada exitosamente');
    loadCategoriesList();
  } catch (error) {
    console.error('Error al eliminar categoría:', error);
    alert(error.message || 'Error al eliminar la categoría');
  }
};

// Event listeners para botones de agregar categoría
document.getElementById('add-category-btn').addEventListener('click', openAddCategoryModal);
document.getElementById('cancel-add-category').addEventListener('click', closeAddCategoryModal);
document.getElementById('category-name').addEventListener('input', (event) => {
  const originalSlug = document.getElementById('category-slug').value;
  const slugField = document.getElementById('category-public-slug');
  if (!originalSlug && !slugField.dataset.manuallyEdited) {
    slugField.value = categorySlugify(event.target.value);
  }
});
document.getElementById('category-public-slug').addEventListener('input', (event) => {
  event.target.dataset.manuallyEdited = event.target.value ? 'true' : '';
});

// Event listener para formulario de agregar categoría
document.getElementById('add-category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  const categorySlug = document.getElementById('category-slug').value;
  const requestedSlug = categorySlugify(data.slug || data.name);
  
  // Si no hay slug anterior, se está creando una categoría nueva.
  const isEdit = !!categorySlug;
  const url = isEdit ? `/api/categories/${categorySlug}` : '/api/categories';
  const method = isEdit ? 'PUT' : 'POST';
  
  // Guardar siempre el enlace normalizado; al editar también puede cambiarse.
  if (!requestedSlug) {
    alert('Indica un nombre o un enlace válido para la categoría.');
    return;
  }
  data.slug = requestedSlug;
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar categoría');
    }
    
    closeAddCategoryModal();
    alert(isEdit ? 'Categoría actualizada exitosamente' : 'Categoría creada exitosamente');
    loadCategoriesList();
  } catch (error) {
    console.error('Error al guardar categoría:', error);
    alert(error.message || 'Error al guardar la categoría');
  }
});

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - CRUD DE MÉTODOS DE PAGO
   ============================================================ */

// Función para abrir modal de agregar método de pago
function openAddPaymentMethodModal() {
  const modal = document.getElementById('add-payment-method-modal');
  document.getElementById('payment-method-modal-title').textContent = 'Agregar Nuevo Método de Pago';
  document.getElementById('payment-method-id').value = '';
  document.getElementById('add-payment-method-form').reset();
  
  modal.style.display = 'flex';
  
  gsap.fromTo(modal.querySelector('.admin-modal-content'),
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
  );
}

// Función para cerrar modal de agregar método de pago
function closeAddPaymentMethodModal() {
  const modal = document.getElementById('add-payment-method-modal');
  
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
      document.getElementById('add-payment-method-form').reset();
    }
  });
}

// Función para editar método de pago
window.editPaymentMethod = async function(paymentMethodId) {
  try {
    const response = await fetch(`/api/payment-methods?all=1`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    const paymentMethods = await response.json();
    const method = paymentMethods.find(m => m.id === paymentMethodId);
    
    if (!method) {
      throw new Error('Método de pago no encontrado');
    }
    
    // Llenar el formulario con los datos del método de pago
    document.getElementById('payment-method-modal-title').textContent = 'Editar Método de Pago';
    document.getElementById('payment-method-id').value = method.id;
    document.getElementById('payment-method-label').value = method.label;
    document.getElementById('payment-method-icon').value = method.icon;
    document.getElementById('payment-method-active').checked = method.active;
    
    const modal = document.getElementById('add-payment-method-modal');
    modal.style.display = 'flex';
    
    gsap.fromTo(modal.querySelector('.admin-modal-content'),
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
    );
  } catch (error) {
    console.error('Error al cargar método de pago:', error);
    alert('Error al cargar el método de pago');
  }
};

// Función para eliminar método de pago
window.deletePaymentMethod = async function(paymentMethodId) {
  if (!(await requestConfirmation('¿Deseas eliminar este método de pago?'))) {
    return;
  }
  
  try {
    const response = await fetch(`/api/payment-methods/${paymentMethodId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar método de pago');
    }
    
    alert('Método de pago eliminado exitosamente');
    loadPaymentMethodsList();
  } catch (error) {
    console.error('Error al eliminar método de pago:', error);
    alert(error.message || 'Error al eliminar el método de pago');
  }
};

// Event listeners para botones de agregar método de pago
document.getElementById('add-payment-method-btn').addEventListener('click', openAddPaymentMethodModal);
document.getElementById('cancel-add-payment-method').addEventListener('click', closeAddPaymentMethodModal);

// Event listener para formulario de agregar método de pago
document.getElementById('add-payment-method-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  const paymentMethodId = document.getElementById('payment-method-id').value;
  
  // Convertir checkbox a boolean
  data.active = document.getElementById('payment-method-active').checked;
  
  // Si no hay ID, es una creación nueva
  const isEdit = !!paymentMethodId;
  const url = isEdit ? `/api/payment-methods/${paymentMethodId}` : '/api/payment-methods';
  const method = isEdit ? 'PUT' : 'POST';
  
  // Si es edición, no enviar el ID en el body
  if (isEdit) {
    delete data.id;
  }
  
  try {
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar método de pago');
    }
    
    closeAddPaymentMethodModal();
    alert(isEdit ? 'Método de pago actualizado exitosamente' : 'Método de pago creado exitosamente');
    loadPaymentMethodsList();
  } catch (error) {
    console.error('Error al guardar método de pago:', error);
    alert(error.message || 'Error al guardar el método de pago');
  }
});

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - GESTIÓN DE ACERCA DE NOSOTROS
   ============================================================ */

// Función para abrir modal de editar "Acerca de nosotros"
function openEditAboutModal() {
  const modal = document.getElementById('edit-about-modal');
  
  // Cargar datos existentes
  fetch('/api/about')
    .then(response => response.json())
    .then(data => {
      if (data) {
        document.getElementById('about-title').value = data.title || '';
        document.getElementById('about-description').value = data.description || '';
        document.getElementById('about-address').value = data.address || '';
        document.getElementById('about-phone').value = data.phone || '';
        document.getElementById('about-email').value = data.email || '';
        document.getElementById('about-hours').value = data.hours || '';
      }
    })
    .catch(error => {
      console.error('Error al cargar información:', error);
    });
  
  modal.style.display = 'flex';
  
  gsap.fromTo(modal.querySelector('.admin-modal-content'),
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
  );
}

// Función para cerrar modal de editar "Acerca de nosotros"
function closeEditAboutModal() {
  const modal = document.getElementById('edit-about-modal');
  
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
      document.getElementById('edit-about-form').reset();
    }
  });
}

// Event listeners para botones de editar "Acerca de nosotros"
document.getElementById('edit-about-btn')?.addEventListener('click', openEditAboutModal);
document.getElementById('cancel-edit-about')?.addEventListener('click', closeEditAboutModal);

// Event listener para formulario de editar "Acerca de nosotros"
document.getElementById('edit-about-form')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const data = Object.fromEntries(formData.entries());
  
  try {
    const response = await fetch('/api/about', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al guardar información');
    }
    
    closeEditAboutModal();
    loadAboutAdminPreview();
    loadAboutContent();
    alert('Información institucional actualizada exitosamente');
  } catch (error) {
    console.error('Error al guardar información:', error);
    alert(error.message || 'Error al guardar la información');
  }
});

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - FILTROS DE PEDIDOS
   ============================================================ */

// Event listener para aplicar filtros de pedidos
document.getElementById('apply-filters')?.addEventListener('click', () => {
  const status = document.getElementById('filter-status')?.value;
  const dateFrom = document.getElementById('filter-date-from')?.value;
  const dateTo = document.getElementById('filter-date-to')?.value;
  
  const filters = {
    status: status || null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null
  };
  
  loadOrdersList(allOrders, filters);
});

// Event listener para limpiar filtros de pedidos
document.getElementById('clear-filters')?.addEventListener('click', () => {
  if(document.getElementById('filter-status')) document.getElementById('filter-status').value = '';
  if(document.getElementById('filter-date-from')) document.getElementById('filter-date-from').value = '';
  if(document.getElementById('filter-date-to')) document.getElementById('filter-date-to').value = '';
  
  loadOrdersList(allOrders, {});
});

// Accesos rápidos del encabezado administrativo.
document.querySelectorAll('[data-admin-jump]').forEach(button => {
  button.addEventListener('click', () => {
    const target = button.dataset.adminJump === 'billing' ? 'admin-billing-section' : 'admin-orders-section';
    document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - DETALLE DE PEDIDO
   ============================================================ */

// Función para ver detalle de pedido
window.viewOrder = async function(orderId) {
  try {
    const response = await fetch(`/api/orders/${orderId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    
    if (!response.ok) {
      throw new Error('Error al cargar pedido');
    }
    
    const order = await response.json();
    
    // Renderizar detalle del pedido
    const content = document.getElementById('order-detail-content');
    const item = order.artwork || order.book;
    const itemType = order.artwork ? 'Obra' : 'Libro';
    const orderStatusLabels = {
      PENDING: 'Pendiente',
      CONFIRMED: 'Confirmado',
      PAID: 'Pagado',
      CANCELLED: 'Cancelado',
      DELIVERED: 'Entregado'
    };
    
    content.innerHTML = `
      <div class="order-detail-info">
        <div class="order-detail-row">
          <strong>Folio:</strong>
          <span>${order.id}</span>
        </div>
        <div class="order-detail-row">
          <strong>Fecha:</strong>
          <span>${new Date(order.createdAt).toLocaleString()}</span>
        </div>
        <div class="order-detail-row">
          <strong>Cliente:</strong>
          <span>${sanitizeText(order.user?.name || 'N/A')}</span>
        </div>
        <div class="order-detail-row">
          <strong>Email:</strong>
          <span>${sanitizeText(order.user?.email || 'N/A')}</span>
        </div>
        <div class="order-detail-row">
          <strong>Tipo:</strong>
          <span>${itemType}</span>
        </div>
        <div class="order-detail-row">
          <strong>Item:</strong>
          <span>${sanitizeText(item?.title || 'N/A')}</span>
        </div>
        <div class="order-detail-row">
          <strong>Estado:</strong>
          <select id="order-detail-status" class="order-status-select">
            ${Object.entries(orderStatusLabels).map(([status, label]) => `<option value="${status}" ${order.status === status ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
        </div>
        <div class="order-detail-row">
          <strong>Precio:</strong>
          <span>${sanitizeText(order.priceAtPurchase)}</span>
        </div>
        <div class="order-detail-row">
          <strong>Método de Pago:</strong>
          <span>${order.paymentMethod}</span>
        </div>
      </div>
    `;
    
    const modal = document.getElementById('order-detail-modal');
    modal.dataset.orderId = order.id;
    modal.style.display = 'flex';
    
    gsap.fromTo(modal.querySelector('.admin-modal-content'),
      { opacity: 0, y: 30, scale: 0.95 },
      { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
    );
  } catch (error) {
    console.error('Error al cargar pedido:', error);
    alert('Error al cargar el pedido');
  }
};

// Event listener para cerrar modal de detalle de pedido
document.getElementById('close-order-detail')?.addEventListener('click', () => {
  const modal = document.getElementById('order-detail-modal');
  
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
    }
  });
});

document.addEventListener('click', async (event) => {
  if(event.target.id !== 'save-order-status') return;
  const modal = document.getElementById('order-detail-modal');
  const orderId = modal.dataset.orderId;
  const status = document.getElementById('order-detail-status')?.value;
  if(!orderId || !status) return;
  try {
    const response = await fetch(`/api/orders/${orderId}/status`, { method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${authToken}`}, body:JSON.stringify({status}) });
    const data = await response.json();
    if(!response.ok) throw new Error(data.error || 'No se pudo actualizar el estado.');
    modal.style.display='none';
    loadAdminDashboard();
    alert('Estado del pedido actualizado.');
  } catch(error){ alert(error.message); }
});

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - EDITOR VISUAL DE HOTSPOTS MODAL
   ============================================================ */

function openHotspotEditor() {
  const modal = document.getElementById('hotspot-editor-modal');
  if(!modal) return;
  modal.style.display = 'flex';
  loadRoomsForHotspotEditor();
  
  gsap.fromTo(modal.querySelector('.admin-modal-content'),
    { opacity: 0, y: 30, scale: 0.95 },
    { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'power2.out' }
  );
}

function closeHotspotEditor() {
  const modal = document.getElementById('hotspot-editor-modal');
  if(!modal) return;
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0,
    y: 30,
    scale: 0.95,
    duration: 0.3,
    ease: 'power2.in',
    onComplete: () => {
      modal.style.display = 'none';
      currentEditingRoom = null;
      editingHotspots = [];
    }
  });
}

async function loadRoomsForHotspotEditor() {
  try {
    const response = await fetch('/api/rooms');
    const rooms = await response.json();
    
    const select = document.getElementById('hotspot-room-select');
    if(!select) return;
    select.innerHTML = rooms.map(room => 
      `<option value="${room.id}">${sanitizeText(room.name)}</option>`
    ).join('');
    
    if (rooms.length > 0) {
      loadRoomForHotspotEditor(rooms[0].id);
    }
  } catch (error) {
    console.error('Error al cargar salas:', error);
  }
}

async function loadRoomForHotspotEditor(roomId) {
  try {
    const response = await fetch(`/api/rooms/${roomId}`);
    const room = await response.json();
    
    currentEditingRoom = room;
    
    const image = document.getElementById('hotspot-editor-image');
    if(image) image.src = room.imageUrl || '';

    image.onload = () => {
      positionModalEditorOverlay();
      renderHotspots();
    };
    if(image.complete && image.naturalWidth) {
      positionModalEditorOverlay();
    }

    editingHotspots = (room.artworks || []).map(art => ({
      id: art.id,
      left: art.hotspotLeft ?? 10,
      top: art.hotspotTop ?? 10,
      width: art.hotspotWidth ?? 20,
      height: art.hotspotHeight ?? 20,
      title: art.title
    }));
    
    renderHotspots();
  } catch (error) {
    console.error('Error al cargar sala:', error);
  }
}

function positionModalEditorOverlay() {
  const img = document.getElementById('hotspot-editor-image');
  const overlay = document.getElementById('hotspot-editor-hotspots');
  const container = document.getElementById('hotspot-editor-image-container');
  if(overlay && img && container){
    const rect = getImageRect(img, container);
    overlay.style.left = rect.offsetX + 'px';
    overlay.style.top = rect.offsetY + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }
}

function renderHotspots() {
  const container = document.getElementById('hotspot-editor-hotspots');
  if(!container) return;
  container.innerHTML = '';
  
  editingHotspots.forEach((hotspot, index) => {
    const div = document.createElement('div');
    div.className = 'hotspot-editor-hotspot';
    div.style.left = (hotspot.left / 100 * container.clientWidth) + 'px';
    div.style.top = (hotspot.top / 100 * container.clientHeight) + 'px';
    div.style.width = Math.max(8, hotspot.width / 100 * container.clientWidth) + 'px';
    div.style.height = Math.max(8, hotspot.height / 100 * container.clientHeight) + 'px';
    div.dataset.index = index;
    
    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${pos}`;
      handle.dataset.handle = pos;
      div.appendChild(handle);
    });
    
    div.addEventListener('mousedown', startDragHotspot);
    container.appendChild(div);
  });
}

let isDragging = false;
let isResizing = false;
let currentHotspot = null;
let currentHandle = null;
let startX, startY, startLeft, startTop, startWidth, startHeight;

function startDragHotspot(e) {
  if (e.target.classList.contains('resize-handle')) {
    isResizing = true;
    currentHandle = e.target.dataset.handle;
  } else {
    isDragging = true;
  }
  
  currentHotspot = e.currentTarget;
  const index = parseInt(currentHotspot.dataset.index);
  const container = document.getElementById('hotspot-editor-hotspots');
  
  startX = e.clientX;
  startY = e.clientY;
  if (container) {
    const rect = container.getBoundingClientRect();
    startLeft = editingHotspots[index].left / 100 * rect.width;
    startTop = editingHotspots[index].top / 100 * rect.height;
    startWidth = editingHotspots[index].width / 100 * rect.width;
    startHeight = editingHotspots[index].height / 100 * rect.height;
  }
  
  e.preventDefault();
}

document.addEventListener('mousemove', (e) => {
  if (!currentHotspot) return;
  
  const container = document.getElementById('hotspot-editor-hotspots');
  if(!container) return;
  const rect = container.getBoundingClientRect();
  
  const deltaX = (e.clientX - startX);
  const deltaY = (e.clientY - startY);
  const index = parseInt(currentHotspot.dataset.index);
  
  if (isDragging) {
    let newLeft = startLeft + deltaX;
    let newTop = startTop + deltaY;
    
    newLeft = Math.max(0, Math.min(rect.width - startWidth, newLeft));
    newTop = Math.max(0, Math.min(rect.height - startHeight, newTop));
    
    currentHotspot.style.left = newLeft + 'px';
    currentHotspot.style.top = newTop + 'px';
    
    editingHotspots[index].left = Math.round(newLeft / rect.width * 1000) / 10;
    editingHotspots[index].top = Math.round(newTop / rect.height * 1000) / 10;
  } else if (isResizing) {
    let newLeft = startLeft;
    let newTop = startTop;
    let newWidth = startWidth;
    let newHeight = startHeight;
    
    if (currentHandle.includes('e')) {
      newWidth = Math.max(8, startWidth + deltaX);
    }
    if (currentHandle.includes('w')) {
      newWidth = Math.max(8, startWidth - deltaX);
      newLeft = startLeft + deltaX;
    }
    if (currentHandle.includes('s')) {
      newHeight = Math.max(8, startHeight + deltaY);
    }
    if (currentHandle.includes('n')) {
      newHeight = Math.max(8, startHeight - deltaY);
      newTop = startTop + deltaY;
    }
    
    currentHotspot.style.left = newLeft + 'px';
    currentHotspot.style.top = newTop + 'px';
    currentHotspot.style.width = newWidth + 'px';
    currentHotspot.style.height = newHeight + 'px';
    
    editingHotspots[index].left = Math.round(newLeft / rect.width * 1000) / 10;
    editingHotspots[index].top = Math.round(newTop / rect.height * 1000) / 10;
    editingHotspots[index].width = Math.round(newWidth / rect.width * 1000) / 10;
    editingHotspots[index].height = Math.round(newHeight / rect.height * 1000) / 10;
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  isResizing = false;
  currentHotspot = null;
  currentHandle = null;
});

document.getElementById('hotspot-room-select')?.addEventListener('change', (e) => {
  loadRoomForHotspotEditor(e.target.value);
});

document.getElementById('add-hotspot-btn')?.addEventListener('click', () => {
  editingHotspots.push({
    id: null,
    left: 40,
    top: 40,
    width: 20,
    height: 20,
    title: 'Nuevo Hotspot'
  });
  renderHotspots();
});

document.getElementById('save-hotspots-btn')?.addEventListener('click', async () => {
  try {
    if (!currentEditingRoom) {
      throw new Error('No hay sala seleccionada');
    }

    for (const hotspot of editingHotspots) {
      if (hotspot.id) {
        // Actualizar hotspot existente
        const response = await fetch(`/api/artworks/${hotspot.id}/hotspot`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            hotspotLeft: hotspot.left,
            hotspotTop: hotspot.top,
            hotspotWidth: hotspot.width,
            hotspotHeight: hotspot.height
          })
        });
        
        if (!response.ok) {
          throw new Error('Error al actualizar hotspot');
        }
      } else {
        // Crear nueva obra para el hotspot
        const response = await fetch('/api/artworks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            roomId: currentEditingRoom.id,
            title: hotspot.title || 'Nueva Obra',
            artist: 'Balam',
            year: '2025',
            medium: 'Por definir',
            dims: 'Por definir',
            price: 'Q1,000',
            description: 'Descripción pendiente',
            hotspotLeft: hotspot.left,
            hotspotTop: hotspot.top,
            hotspotWidth: hotspot.width,
            hotspotHeight: hotspot.height
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error al crear nueva obra');
        }
      }
    }
    
    alert('Hotspots guardados exitosamente');
    loadRoomsList();
    loadArtworksAdminList();
    loadRoomForHotspotEditor(currentEditingRoom.id);
    
    // Forzar recarga de datos en el cliente
    dataLoaded = false;
    await loadApiData(true);
  } catch (error) {
    console.error('Error al guardar hotspots:', error);
    alert('Error al guardar los hotspots: ' + error.message);
  }
});

document.getElementById('hotspot-editor-btn')?.addEventListener('click', openHotspotEditor);
document.getElementById('cancel-hotspot-editor')?.addEventListener('click', closeHotspotEditor);

/* ============================================================
   FUNCIONES DE ADMINISTRACIÓN - EDITOR VISUAL DE HOTSPOTS EN TAB
   ============================================================ */

let tabEditingRoom = null;
let tabEditingHotspots = [];
let tabIsDragging = false;
let tabIsResizing = false;
let tabCurrentHotspot = null;
let tabCurrentHandle = null;
let tabStartX, tabStartY, tabStartLeft, tabStartTop, tabStartWidth, tabStartHeight;

// Posicionar overlay del editor de hotspots para que coincida con el área real de la imagen
function positionTabEditorOverlay() {
  const img = document.getElementById('tab-hotspot-image');
  const overlay = document.getElementById('tab-hotspot-points');
  const container = document.getElementById('tab-hotspot-image-container');
  if (!img || !overlay || !container) return;
  
  if (!img.src || !img.naturalWidth) {
    overlay.style.left = '0';
    overlay.style.top = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    return;
  }
  
  const rect = getImageRect(img, container);
  overlay.style.left = rect.offsetX + 'px';
  overlay.style.top = rect.offsetY + 'px';
  overlay.style.width = rect.width + 'px';
  overlay.style.height = rect.height + 'px';
}

async function loadRoomsForTabHotspotEditor() {
  const select = document.getElementById('tab-hotspot-room-select');
  if(!select) return;
  try {
    const response = await fetch('/api/rooms');
    const rooms = await response.json();
    
    const photoRooms = rooms.filter(r => r.type === 'PHOTO' || r.imageUrl);
    if(photoRooms.length === 0){
      select.innerHTML = '<option value="">No hay salas con fotografía</option>';
      const img = document.getElementById('tab-hotspot-image');
      if(img) img.src = '';
      const points = document.getElementById('tab-hotspot-points');
      if(points) points.innerHTML = '<p class="admin-empty-state" style="padding:2rem;">Esta sala no tiene una fotografía asignada. Edita la sala para subir una imagen panorámica.</p>';
      return;
    }
    
    select.innerHTML = photoRooms.map(room => 
      `<option value="${room.id}">${sanitizeText(room.name)} - ${sanitizeText(room.theme)}</option>`
    ).join('');
    
    if (photoRooms.length > 0) {
      loadRoomForTabHotspotEditor(photoRooms[0].id);
    }
  } catch (error) {
    console.error('Error al cargar salas para hotspot tab:', error);
  }
}

async function loadRoomForTabHotspotEditor(roomId) {
  if(!roomId) return;
  try {
    const response = await fetch(`/api/rooms/${roomId}`);
    const room = await response.json();
    tabEditingRoom = room;
    
    const image = document.getElementById('tab-hotspot-image');
    if(image) image.src = room.imageUrl || '';

    // Aplicar píxeles reales de la imagen al overlay y reposicionar
    image.onload = () => {
      tabEditingRoom._overlayReady = true;
      positionTabEditorOverlay();
      renderTabHotspots();
    };
    if(image.complete && image.naturalWidth) {
      tabEditingRoom._overlayReady = true;
      positionTabEditorOverlay();
    }

    tabEditingHotspots = (room.artworks || []).map(art => ({
      id: art.id,
      left: art.hotspotLeft ?? 10,
      top: art.hotspotTop ?? 10,
      width: art.hotspotWidth ?? 20,
      height: art.hotspotHeight ?? 20,
      title: art.title
    }));
    
    renderTabHotspots();
  } catch (error) {
    console.error('Error al cargar sala para hotspot tab:', error);
  }
}

function positionTabHotspotElement(hotspot, index) {
  const container = document.getElementById('tab-hotspot-points');
  if(!container) return;
  let div = container.querySelector(`[data-index="${index}"]`);
  if(!div){
    div = document.createElement('div');
    div.className = 'hotspot-editor-hotspot';
    div.dataset.index = index;
    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${pos}`;
      handle.dataset.handle = pos;
      div.appendChild(handle);
    });
    div.addEventListener('mousedown', startDragTabHotspot);
    container.appendChild(div);
  }
  div.style.left = (hotspot.left / 100 * container.clientWidth) + 'px';
  div.style.top = (hotspot.top / 100 * container.clientHeight) + 'px';
  div.style.width = Math.max(8, hotspot.width / 100 * container.clientWidth) + 'px';
  div.style.height = Math.max(8, hotspot.height / 100 * container.clientHeight) + 'px';
}

function renderTabHotspots() {
  const container = document.getElementById('tab-hotspot-points');
  if(!container) return;
  container.innerHTML = '';
  
  tabEditingHotspots.forEach((hotspot, index) => {
    const div = document.createElement('div');
    div.className = 'hotspot-editor-hotspot';
    div.style.left = (hotspot.left / 100 * container.clientWidth) + 'px';
    div.style.top = (hotspot.top / 100 * container.clientHeight) + 'px';
    div.style.width = Math.max(8, hotspot.width / 100 * container.clientWidth) + 'px';
    div.style.height = Math.max(8, hotspot.height / 100 * container.clientHeight) + 'px';
    div.dataset.index = index;
    
    const label = document.createElement('div');
    label.style.cssText = 'position:absolute; top:-22px; left:0; background:rgba(0,0,0,0.85); color:#faebd7; padding:2px 6px; font-size:11px; border-radius:3px; white-space:nowrap; pointer-events:none; border:1px solid var(--brass);';
    label.textContent = hotspot.title || `Obra #${index + 1}`;
    div.appendChild(label);

    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
      const handle = document.createElement('div');
      handle.className = `resize-handle ${pos}`;
      handle.dataset.handle = pos;
      div.appendChild(handle);
    });
    
    div.addEventListener('mousedown', startDragTabHotspot);
    container.appendChild(div);
  });
}

function startDragTabHotspot(e) {
  if (e.target.classList.contains('resize-handle')) {
    tabIsResizing = true;
    tabCurrentHandle = e.target.dataset.handle;
  } else {
    tabIsDragging = true;
  }
  
  tabCurrentHotspot = e.currentTarget;
  const index = parseInt(tabCurrentHotspot.dataset.index);
  const overlay = document.getElementById('tab-hotspot-points');
  
  tabStartX = e.clientX;
  tabStartY = e.clientY;
  if (overlay) {
    const rect = overlay.getBoundingClientRect();
    tabStartLeft = tabEditingHotspots[index].left / 100 * rect.width;
    tabStartTop = tabEditingHotspots[index].top / 100 * rect.height;
    tabStartWidth = tabEditingHotspots[index].width / 100 * rect.width;
    tabStartHeight = tabEditingHotspots[index].height / 100 * rect.height;
  }
  
  e.preventDefault();
}

document.addEventListener('mousemove', (e) => {
  if (!tabCurrentHotspot) return;
  
  const overlay = document.getElementById('tab-hotspot-points');
  if(!overlay) return;
  const rect = overlay.getBoundingClientRect();
  
  const deltaX = (e.clientX - tabStartX);
  const deltaY = (e.clientY - tabStartY);
  const index = parseInt(tabCurrentHotspot.dataset.index);
  
  if (tabIsDragging) {
    let newLeft = tabStartLeft + deltaX;
    let newTop = tabStartTop + deltaY;
    
    newLeft = Math.max(0, Math.min(rect.width - tabStartWidth, newLeft));
    newTop = Math.max(0, Math.min(rect.height - tabStartHeight, newTop));
    
    tabCurrentHotspot.style.left = newLeft + 'px';
    tabCurrentHotspot.style.top = newTop + 'px';
    
    tabEditingHotspots[index].left = Math.round(newLeft / rect.width * 1000) / 10;
    tabEditingHotspots[index].top = Math.round(newTop / rect.height * 1000) / 10;
  } else if (tabIsResizing) {
    let newLeft = tabStartLeft;
    let newTop = tabStartTop;
    let newWidth = tabStartWidth;
    let newHeight = tabStartHeight;
    
    if (tabCurrentHandle.includes('e')) {
      newWidth = Math.max(8, tabStartWidth + deltaX);
    }
    if (tabCurrentHandle.includes('w')) {
      newWidth = Math.max(8, tabStartWidth - deltaX);
      newLeft = tabStartLeft + deltaX;
    }
    if (tabCurrentHandle.includes('s')) {
      newHeight = Math.max(8, tabStartHeight + deltaY);
    }
    if (tabCurrentHandle.includes('n')) {
      newHeight = Math.max(8, tabStartHeight - deltaY);
      newTop = tabStartTop + deltaY;
    }
    
    tabCurrentHotspot.style.left = newLeft + 'px';
    tabCurrentHotspot.style.top = newTop + 'px';
    tabCurrentHotspot.style.width = newWidth + 'px';
    tabCurrentHotspot.style.height = newHeight + 'px';
    
    tabEditingHotspots[index].left = Math.round(newLeft / rect.width * 1000) / 10;
    tabEditingHotspots[index].top = Math.round(newTop / rect.height * 1000) / 10;
    tabEditingHotspots[index].width = Math.round(newWidth / rect.width * 1000) / 10;
    tabEditingHotspots[index].height = Math.round(newHeight / rect.height * 1000) / 10;
  }
});

document.addEventListener('mouseup', () => {
  tabIsDragging = false;
  tabIsResizing = false;
  tabCurrentHotspot = null;
  tabCurrentHandle = null;
});

document.getElementById('tab-hotspot-room-select')?.addEventListener('change', (e) => {
  loadRoomForTabHotspotEditor(e.target.value);
});

document.getElementById('tab-add-hotspot-btn')?.addEventListener('click', () => {
  tabEditingHotspots.push({
    id: null,
    left: 40,
    top: 40,
    width: 20,
    height: 20,
    title: 'Nuevo Hotspot'
  });
  renderTabHotspots();
});

document.getElementById('tab-save-hotspots-btn')?.addEventListener('click', async () => {
  try {
    if (!tabEditingRoom) {
      throw new Error('No hay sala seleccionada');
    }

    for (const hotspot of tabEditingHotspots) {
      if (hotspot.id) {
        // Actualizar hotspot existente
        const response = await fetch(`/api/artworks/${hotspot.id}/hotspot`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            hotspotLeft: hotspot.left,
            hotspotTop: hotspot.top,
            hotspotWidth: hotspot.width,
            hotspotHeight: hotspot.height
          })
        });
        
        if (!response.ok) {
          throw new Error('Error al actualizar hotspot');
        }
      } else {
        // Crear nueva obra para el hotspot
        const response = await fetch('/api/artworks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({
            roomId: tabEditingRoom.id,
            title: hotspot.title || 'Nueva Obra',
            artist: 'Balam',
            year: '2025',
            medium: 'Por definir',
            dims: 'Por definir',
            price: 'Q1,000',
            description: 'Descripción pendiente',
            hotspotLeft: hotspot.left,
            hotspotTop: hotspot.top,
            hotspotWidth: hotspot.width,
            hotspotHeight: hotspot.height
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Error al crear nueva obra');
        }
      }
    }
    
    showToast('Posiciones de hotspots guardadas exitosamente.');
    loadRoomsList();
    loadArtworksAdminList();
    loadRoomForTabHotspotEditor(tabEditingRoom.id);
    
    // Forzar recarga de datos en el cliente
    dataLoaded = false;
    await loadApiData(true);
  } catch (error) {
    console.error('Error al guardar hotspots:', error);
    showToast('Error al guardar los hotspots: ' + error.message, 'error');
  }
});

/* ============================================================
   EVENT LISTENERS - ECOSISTEMA DE ADMINISTRACIÓN
   ============================================================ */

// Pestañas de navegación del administrador
document.querySelectorAll('.admin-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchAdminTab(btn.dataset.tab);
  });
});

// Cierre genérico de modales de administración: click en el backdrop o tecla Escape
(function bindAdminModalDismissals(){
  const closeModalFade = (modal) => {
    const content = modal.querySelector('.admin-modal-content');
    if(content && window.gsap){
      gsap.to(content, { opacity:0, y:30, scale:0.95, duration:0.25, ease:'power2.in',
        onComplete: () => { modal.style.display='none'; content.style.opacity=''; content.style.transform=''; }
      });
    } else {
      modal.style.display = 'none';
    }
  };

  // Click en el backdrop de cualquier modal de administración visible lo cierra
  document.addEventListener('click', (e) => {
    if(e.target.classList && e.target.classList.contains('admin-modal-backdrop')){
      const modal = e.target.closest('.admin-modal');
      if(modal) closeModalFade(modal);
    }
  });

  // Tecla Escape cierra el modal de administración visible más reciente
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape'){
      const modals = Array.from(document.querySelectorAll('.admin-modal'));
      for(let i = modals.length - 1; i >= 0; i--){
        if(modals[i].style.display !== 'none' && modals[i].style.display !== ''){
          closeModalFade(modals[i]);
          break;
        }
      }
    }
  });
})();

// Botones de acceso rápido en Overview
document.getElementById('shortcut-add-artwork')?.addEventListener('click', () => {
  switchAdminTab('artworks');
  openAddArtworkModal();
});
document.getElementById('shortcut-add-room')?.addEventListener('click', () => {
  switchAdminTab('rooms');
  openAddRoomModal();
});
document.getElementById('shortcut-add-book')?.addEventListener('click', () => {
  switchAdminTab('books');
  openAddBookModal();
});
document.getElementById('shortcut-view-orders')?.addEventListener('click', () => {
  switchAdminTab('orders');
});

// Botones de previsualización y retorno
document.getElementById('return-to-admin-dashboard-btn')?.addEventListener('click', () => {
  switchView('adminDashboard');
  loadAdminDashboard();
});

// Reposicionar overlays del editor de hotspots al redimensionar la ventana
window.addEventListener('resize', () => {
  if(currentAdminTab === 'hotspots' && tabEditingRoom){
    positionTabEditorOverlay();
    renderTabHotspots();
  }
  const modalOverlay = document.getElementById('hotspot-editor-hotspots');
  if(modalOverlay && modalOverlay.querySelector('.hotspot-editor-hotspot')){
    positionModalEditorOverlay();
    renderHotspots();
  }
});

// El botón de perfil y el panel de cuenta se controlan mediante la delegación
// de eventos definida al inicio del script.

// Cerrar modal de perfil (mantenido por compatibilidad)
document.getElementById('close-admin-profile')?.addEventListener('click', () => {
  const modal = document.getElementById('admin-profile-modal');
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0, y: 30, scale: 0.95, duration: 0.3, ease: 'power2.in',
    onComplete: () => { modal.style.display = 'none'; }
  });
});
document.getElementById('profile-modal-close-btn')?.addEventListener('click', () => {
  const modal = document.getElementById('admin-profile-modal');
  gsap.to(modal.querySelector('.admin-modal-content'), {
    opacity: 0, y: 30, scale: 0.95, duration: 0.3, ease: 'power2.in',
    onComplete: () => { modal.style.display = 'none'; }
  });
});
document.getElementById('profile-modal-logout-btn')?.addEventListener('click', () => {
  document.getElementById('admin-profile-modal').style.display = 'none';
  adminLogout();
});

// Filtros para la tabla de obras en el panel de administración
document.getElementById('artwork-search-filter')?.addEventListener('input', () => {
  loadArtworksAdminList();
});
document.getElementById('artwork-room-filter')?.addEventListener('change', () => {
  loadArtworksAdminList();
});
document.getElementById('artwork-status-filter')?.addEventListener('change', () => {
  loadArtworksAdminList();
});

// Hash routing
window.addEventListener('hashchange', handleHashChange);
window.addEventListener('popstate', handleHashChange);

/* ============================================================
   Custom Cursor
   ============================================================ */

const cursor = document.getElementById('cursor');
const isTouch = window.matchMedia('(max-width: 860px)').matches;

if(!isTouch && cursor){
  const xTo = gsap.quickTo(cursor, "x", {duration: 0.35, ease: "power3"});
  const yTo = gsap.quickTo(cursor, "y", {duration: 0.35, ease: "power3"});
  
  window.addEventListener('mousemove', e => {
    xTo(e.clientX);
    yTo(e.clientY);
  });
  
  document.addEventListener('mouseover', e => {
    if(e.target.closest('.hotspot') || e.target.closest('.room-card') || e.target.closest('.nav-btn')){
      gsap.to(cursor, { opacity: 1, scale: 1, duration: 0.3 });
    }
  });
  
  document.addEventListener('mouseout', e => {
    if(e.target.closest('.hotspot') || e.target.closest('.room-card') || e.target.closest('.nav-btn')){
      gsap.to(cursor, { opacity: 0, scale: 0.8, duration: 0.3 });
    }
  });
}

/* ============================================================
   Inicialización
   ============================================================ */

gsap.registerPlugin(ScrollTrigger);

// Inicializar vista según hash actual o ir a landing
document.addEventListener('DOMContentLoaded', () => {
  // Cargar sesión guardada y reflejarla en el panel de cuenta del cliente
  if(!currentUser){
    currentUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
  }
  if(typeof refreshClientAccount === 'function') refreshClientAccount();

  if(window.location.hash){
    handleHashChange();
  } else {
    switchView('landing');
  }
  
  // Animación inicial del hero del landing
  gsap.fromTo('#landing-hero .spot',
    { scale: 0.8, opacity: 0.5 },
    { scale: 1, opacity: 1, duration: 2, ease: 'power2.out' }
  );
  
  gsap.fromTo('#landing-hero h1',
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, delay: 0.3, ease: 'power3.out' }
  );
  
  gsap.fromTo('#landing-hero p',
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, delay: 0.5, ease: 'power3.out' }
  );
  
  gsap.fromTo('#landing-hero .landing-btn',
    { y: 20, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, delay: 0.7, ease: 'power3.out' }
  );
});

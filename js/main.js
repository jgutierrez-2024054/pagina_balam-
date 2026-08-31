/* ============================================================
   DATOS DE LA GALERÍA — edítalos libremente.
   Cada "sala" agrupa obras que aparecerán una junto a otra.
   Cuando tengas las fotos reales de tu galería, reemplaza el
   campo `image` con la URL/ruta de la foto de esa obra.
   Si `image` queda vacío (""), se muestra un lienzo abstracto
   de relleno generado con degradados (para maquetar sin fotos).

   NOTA sobre fotos con VARIAS obras en un mismo encuadre:
   si subes una sola foto de una pared con varios cuadros,
   lo ideal es recortar cada cuadro en una imagen individual
   (más simple y con mejor calidad al hacer zoom). Si prefieres
   usar la foto completa con puntos clicables sobre cada cuadro,
   dímelo y adapto esta sección a un modo de "hotspots" por
   coordenadas (x%, y%) sobre una sola imagen.
   ============================================================ */

// Datos de salas con fotos reales + hotspots
const PHOTO_SCENES = [
  {
    name: "Sala I",
    theme: "Instalación textil",
    image: "images/sala-trapos.jpeg",
    hotspots: [
      {
        id: "photo-0-0",
        left:11.5, top:35, width:9, height:13,
        title:"Vestigio Morado", artist:"Balam", year:"2025",
        medium:"Tela teñida intervenida", dims:"40 × 20 cm", price:"Q3,500",
        desc:"Prenda teñida a mano, suspendida como piel descartada. Parte de una serie sobre objetos cotidianos convertidos en reliquia."
      },
      {
        id: "photo-0-1",
        left:31, top:25, width:13, height:27,
        title:"Vestigio Rojo", artist:"Balam", year:"2025",
        medium:"Tela teñida intervenida", dims:"55 × 25 cm", price:"Q3,750",
        desc:"El rojo satura la tela hasta el punto de tensión. Un hilo desciende desde la prenda hasta un ovillo en el piso, conectando ambas piezas."
      },
      {
        id: "photo-0-2",
        left:52, top:34, width:14, height:41,
        title:"Vestigio Verde", artist:"Balam", year:"2025",
        medium:"Tela teñida intervenida", dims:"60 × 30 cm", price:"Q3,750",
        desc:"La prenda más larga de la serie, casi rozando el piso. Su hilo conductor continúa hasta la mesa de ovillos de la sala contigua."
      }
    ]
  },
  {
    name: "Sala II",
    theme: "La esfera",
    image: "images/sala-esfera.jpeg",
    hotspots: [
      {
        id: "photo-1-0",
        left:30, top:26, width:35, height:25,
        title:"Origen (Esfera de hilo)", artist:"Balam", year:"2025",
        medium:"Instalación — hilo tejido sobre estructura esférica", dims:"70 cm diámetro", price:"Q25,000",
        desc:"Pieza central de la instalación: kilómetros de hilo de colores tejidos a mano hasta formar una esfera densa. Los hilos sobrantes descienden hasta ovillos individuales dispuestos bajo la mesa."
      }
    ]
  },
  {
    name: "Sala III",
    theme: "Sala de tortillas",
    image: "images/sala de tortillas.jpeg",
    hotspots: [
      {
        id: "photo-2-0",
        left:25, top:30, width:20, height:30,
        title:"Tortilla y Luna A", artist:"Balam", year:"2025",
        medium:"Grafito sobre papel acuarela", dims:"12 × 9 cm", price:"Q1,400",
        desc:"Estudio en miniatura de la serie lunar. El grafito construye la superficie de la tortilla como si fuese un cuerpo celeste."
      },
      {
        id: "photo-2-1",
        left:55, top:35, width:18, height:25,
        title:"Tortilla y Luna B", artist:"Balam", year:"2025",
        medium:"Grafito sobre papel acuarela", dims:"17 × 12 cm", price:"Q1,700",
        desc:"Segunda variación de la serie: una tortilla retratada con el detalle y la reverencia de un mapa lunar."
      }
    ]
  }
];

// Datos de salas de relleno (sin foto real, usan gradientes)
const ROOMS = [
  {
    name: "Sala III",
    theme: "El deshielo",
    artworks: [
      {
        id: "room-03-0",
        title: "Marea Interior", artist: "Lucía Bravo", year: "2023",
        medium: "Óleo sobre lienzo", dims: "90 × 120 cm", price:"Q14,500",
        desc: "Capas de azul profundo y blanco roto construyen un oleaje detenido a mitad de movimiento. Bravo trabaja el óleo casi como sedimento, dejando que cada pasada seque antes de la siguiente.",
        palette: ["#1e3a5f","#3d6b8a","#eae3d3"], image: ""
      },
      {
        id: "room-03-1",
        title: "Fragmento Solar", artist: "Emiliano Ríos", year: "2022",
        medium: "Acrílico y hoja de oro sobre madera", dims: "70 × 70 cm", price:"Q18,800",
        desc: "Un disco de pan de oro se fractura sobre un fondo terracota. Ríos explora la luz como material físico, no como efecto de color.",
        palette: ["#8a3b2b","#c9a227","#2b1a12"], image: ""
      }
    ]
  },
  {
    name: "Sala IV",
    theme: "Materia y silencio",
    artworks: [
      {
        id: "room-04-0",
        title: "Silencio Ocre", artist: "Paula Ibarra", year: "2024",
        medium: "Técnica mixta sobre lienzo", dims: "100 × 100 cm", price:"Q24,200",
        desc: "Arena, pigmento y cera se acumulan en franjas horizontales. La pieza más grande de Ibarra hasta la fecha, pensada para observarse de cerca y de lejos.",
        palette: ["#6b5030","#c9b183","#241a10"], image: ""
      },
      {
        id: "room-04-1",
        title: "Cuerpo de Agua", artist: "Diego Salas", year: "2021",
        medium: "Óleo sobre lienzo", dims: "80 × 100 cm", price:"Q23,000",
        desc: "Un desnudo disuelto en reflejos verdosos, entre el retrato y el paisaje. Salas retoma la tradición figurativa desde una superficie casi líquida.",
        palette: ["#2f4a3d","#5c8570","#101a15"], image: ""
      }
    ]
  },
  {
    name: "Sala V",
    theme: "Nocturnos",
    artworks: [
      {
        id: "room-05-0",
        title: "Nocturno No. 4", artist: "Renata Kahl", year: "2023",
        medium: "Carboncillo y pastel sobre papel", dims: "60 × 90 cm", price:"Q9,400",
        desc: "Cuarta entrega de una serie sobre insomnio urbano. El carboncillo se difumina hasta perder el contorno de la figura.",
        palette: ["#2a2a33","#6b6b7a","#0e0e12"], image: ""
      },
      {
        id: "room-05-1",
        title: "Vestigio", artist: "Mateo Duarte", year: "2024",
        medium: "Escultura en bronce", dims: "45 × 30 × 30 cm", price:"Q35,000",
        desc: "Pieza única, fundida en bronce a la cera perdida. Duarte parte de restos orgánicos reales para construir su molde.",
        palette: ["#7a5a2e","#c9a227","#241d10"], image: ""
      }
    ]
  }
];

// Métodos de pago (reutilizables para todas las obras)
const PAYMENT_METHODS = [
  { id: "card", label: "Tarjeta de crédito o débito", icon: "💳" },
  { id: "transfer", label: "Transferencia bancaria", icon: "🏦" },
  { id: "cash", label: "Pago contra entrega", icon: "📦" }
];

// Datos de libros/publicaciones
const BOOKS = [
  {
    id: "book-0",
    title: "Magenta E Volumen Uno",
    author: "BALAM",
    year: "2025",
    desc: "Catálogo completo de la serie de instalaciones textiles 'Vestigios', con fotografías de las obras y ensayos críticos sobre la memoria y el despojo en el arte contemporáneo guatemalteco.",
    price:"Q2,750",
    palette: ["#2a3d2e", "#c9a227", "#ede4dd"]
  },
  {
    id: "book-1",
    title: "Magenta E Volumen Dos",
    author: "BALAM",
    year: "2024",
    desc: "Monografía sobre la instalación central de la galería, documentando el proceso de creación de la esfera de hilo y su significado simbólico en el contexto del arte latinoamericano.",
    price:"Q2,200",
    palette: ["#1a2a3a", "#c9a227", "#ede4dd"]
  },
  {
    id: "book-2",
    title: "Magenta E Volumen Tres",
    author: "BALAM",
    year: "2025",
    desc: "Libro de artista que explora la serie de dibujos que eleva lo cotidiano a categoría celestial, con reproducciones de alta calidad de los estudios lunares.",
    price:"Q1,400",
    palette: ["#3d2a2a", "#c9a227", "#ede4dd"]
  }
];

// Descripciones placeholder para las 5 categorías nuevas
// NOTA: Estas descripciones son temporales. Cuando esté listo el contenido real,
// reemplazar estas descripciones con el contenido de las obras de cada categoría.
const CATEGORY_PLACEHOLDERS = {
  pintura: "Próximamente encontrarás aquí piezas en óleo, acrílico y técnica mixta de nuestros artistas.",
  dibujo: "Próximamente encontrarás aquí obras en grafito, carboncillo, pastel y otras técnicas de dibujo.",
  "tinta-china": "Próximamente encontrarás aquí obras tradicionales y contemporáneas en tinta china.",
  caricatura: "Próximamente encontrarás aquí obras de caricatura y sátira visual de nuestros artistas.",
  fotografia: "Próximamente encontrarás aquí fotografía artística, documental y experimental."
};

/* ============================================================
   SISTEMA DE ROUTING Y NAVEGACIÓN
   ============================================================ */

// Estado de la aplicación
let currentRoomIndex = null;
let currentHotspotData = null;

// Elementos DOM
const views = {
  landing: document.getElementById('view-landing'),
  selector: document.getElementById('view-selector'),
  room: document.getElementById('view-room'),
  purchase: document.getElementById('view-purchase'),
  books: document.getElementById('view-books'),
  about: document.getElementById('view-about'),
  category: document.getElementById('view-category')
};

const elements = {
  categoriesToggle: document.getElementById('categories-toggle'),
  categoriesPanel: document.getElementById('categories-panel'),
  startExperience: document.getElementById('start-experience'),
  roomsGrid: document.getElementById('rooms-grid'),
  booksGrid: document.getElementById('books-grid'),
  roomImage: document.getElementById('room-image'),
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
  categoryBackBtn: document.getElementById('category-back-btn')
};

// Función para generar gradiente desde paleta
function gradientFor(p){
  return `radial-gradient(120% 140% at 20% 15%, ${p[1]}, transparent 60%),
          radial-gradient(140% 160% at 80% 90%, ${p[0]}, transparent 65%),
          linear-gradient(160deg, ${p[2]}, ${p[0]})`;
}

// Obtener todas las salas combinadas (PHOTO_SCENES + ROOMS)
function getAllRooms(){
  return [...PHOTO_SCENES, ...ROOMS];
}

// Renderizar grid de libros
function renderBooks(){
  elements.booksGrid.innerHTML = '';
  
  BOOKS.forEach((book, index) => {
    const card = document.createElement('div');
    card.className = 'book-card';
    
    const cover = document.createElement('div');
    cover.className = 'book-cover';
    cover.style.backgroundImage = gradientFor(book.palette);
    
    const info = document.createElement('div');
    info.className = 'book-info';
    info.innerHTML = `
      <h3>${book.title}</h3>
      <div class="author">${book.author}</div>
      <div class="year">${book.year}</div>
      <div class="price">${book.price}</div>
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
}

/* ============================================================
   VISTA 1: Selector de Salas
   ============================================================ */

function renderRoomSelector(){
  const allRooms = getAllRooms();
  elements.roomsGrid.innerHTML = '';
  
  allRooms.forEach((room, index) => {
    const card = document.createElement('div');
    card.className = 'room-card';
    card.onclick = () => navigateToRoom(index);
    
    // Determinar miniatura (imagen real o gradiente)
    let thumbnailStyle = '';
    if(room.image){
      thumbnailStyle = `background-image: url('${room.image}');`;
    } else if(room.artworks && room.artworks.length > 0){
      thumbnailStyle = `background-image: ${gradientFor(room.artworks[0].palette)};`;
    } else {
      thumbnailStyle = `background: linear-gradient(160deg, var(--wall-2), var(--wall-3));`;
    }
    
    card.innerHTML = `
      <div class="thumbnail" style="${thumbnailStyle}"></div>
      <div class="card-body">
        <span class="card-num">${String(index + 1).padStart(2, '0')}</span>
        <h3 class="card-title">${room.name}</h3>
        <span class="card-theme">${room.theme}</span>
      </div>
    `;
    
    elements.roomsGrid.appendChild(card);
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
  elements.currentRoomName.textContent = room.name;
  
  // Configurar imagen o gradiente de fondo
  if(room.image){
    elements.roomImage.src = room.image;
    elements.roomImage.style.display = 'block';
  } else {
    elements.roomImage.style.display = 'none';
    elements.roomPhotoFrame.style.backgroundImage = room.artworks[0] 
      ? gradientFor(room.artworks[0].palette)
      : 'linear-gradient(160deg, var(--wall-2), var(--wall-3))';
    elements.roomPhotoFrame.style.backgroundSize = 'cover';
    elements.roomPhotoFrame.style.backgroundPosition = 'center';
  }
  
  // Renderizar hotspots
  renderHotspots(room);
  
  // Cambiar vista con animación
  switchView('room', index);
}

function renderHotspots(room){
  elements.roomHotspots.innerHTML = '';
  
  const hotspots = room.hotspots || [];
  
  hotspots.forEach((h, hi) => {
    const btn = document.createElement('button');
    btn.className = 'hotspot' + (h.top < 30 ? ' tip-below' : '');
    btn.style.left = h.left + '%';
    btn.style.top = h.top + '%';
    btn.style.width = h.width + '%';
    btn.style.height = h.height + '%';
    btn.setAttribute('aria-label', `${h.title} — ${h.price}`);
    btn.dataset.hotspotIndex = hi;
    
    btn.innerHTML = `
      <span class="dot"></span>
      <span class="tip">
        <span class="tip-title">${h.title}</span>
        <span class="tip-artist">${h.artist}, ${h.year}</span>
        <span class="tip-desc">${h.desc}</span>
        <span class="tip-price">${h.price}</span>
      </span>
    `;
    
    // Click para abrir modal
    btn.addEventListener('click', () => {
      currentHotspotData = h;
      openModal(h);
    });
    
    elements.roomHotspots.appendChild(btn);
  });
  
  // Si es sala de relleno (ROOMS), crear hotspots para cada artwork
  if(room.artworks && !room.hotspots){
    room.artworks.forEach((art, ai) => {
      const btn = document.createElement('button');
      btn.className = 'hotspot';
      // Posicionar en el centro para salas de relleno
      btn.style.left = '40%';
      btn.style.top = '40%';
      btn.style.width = '20%';
      btn.style.height = '20%';
      btn.setAttribute('aria-label', `${art.title} — ${art.price}`);
      btn.dataset.artworkIndex = ai;
      
      btn.innerHTML = `
        <span class="dot"></span>
        <span class="tip">
          <span class="tip-title">${art.title}</span>
          <span class="tip-artist">${art.artist}, ${art.year}</span>
          <span class="tip-desc">${art.desc}</span>
          <span class="tip-price">${art.price}</span>
        </span>
      `;
      
      btn.addEventListener('click', () => {
        currentHotspotData = {...art, roomId: currentRoomIndex, artIndex: ai};
        openModal(art);
      });
      
      elements.roomHotspots.appendChild(btn);
    });
  }
}

/* ============================================================
   VISTA 6: Página de Categoría
   ============================================================ */

function navigateToCategory(categoryId){
  // Verificar si la categoría existe en los placeholders
  if(!CATEGORY_PLACEHOLDERS[categoryId]){
    // Si no existe, redirigir a colecciones
    switchView('selector');
    return;
  }

  // Obtener el nombre formateado de la categoría
  const categoryNames = {
    pintura: 'Pintura',
    dibujo: 'Dibujo',
    'tinta-china': 'Tinta China',
    caricatura: 'Caricatura',
    fotografia: 'Fotografía'
  };

  // Llenar datos de la categoría
  elements.categoryTitle.textContent = categoryNames[categoryId] || categoryId;
  elements.categoryDescText.textContent = CATEGORY_PLACEHOLDERS[categoryId];
  elements.categoryRoomTag.textContent = categoryNames[categoryId] || categoryId;

  // Cambiar vista
  switchView('category');
}

/* ============================================================
   VISTA 3: Detalle de Compra
   ============================================================ */

function navigateToPurchase(data){
  // Determinar si es libro o obra
  const isBook = data.isBook || false;
  
  // Llenar datos
  document.getElementById('purchase-eyebrow').textContent = isBook 
    ? 'Publicación'
    : (data.roomId !== undefined 
      ? `Sala ${data.roomId + 1} · Obra ${data.id}` 
      : `${data.artist} · ${data.year}`);
  
  document.getElementById('purchase-title').textContent = data.title;
  document.getElementById('purchase-artist').textContent = isBook 
    ? `${data.author} · ${data.year}`
    : `${data.artist}, ${data.year}`;
  document.getElementById('purchase-year').textContent = data.year;
  document.getElementById('purchase-medium').textContent = isBook ? 'Libro/Catálogo' : data.medium;
  document.getElementById('purchase-dims').textContent = isBook ? 'Varía según edición' : data.dims;
  document.getElementById('purchase-avail').textContent = 'Disponible';
  document.getElementById('purchase-desc').textContent = data.desc;
  document.getElementById('purchase-price').textContent = data.price;
  
  // Configurar visual
  const canvas = document.getElementById('purchase-canvas');
  if(data.image){
    canvas.style.backgroundImage = `url('${data.image}')`;
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
  
  PAYMENT_METHODS.forEach(method => {
    const option = document.createElement('div');
    option.className = 'payment-option';
    option.innerHTML = `
      <input type="radio" name="payment" id="payment-${method.id}" value="${method.id}">
      <label for="payment-${method.id}">${method.icon} ${method.label}</label>
    `;
    
    option.onclick = () => {
      document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
      option.querySelector('input').checked = true;
    };
    
    elements.paymentOptions.appendChild(option);
  });
}

function confirmPurchaseInterest(){
  const selectedPayment = document.querySelector('input[name="payment"]:checked');
  const method = selectedPayment 
    ? PAYMENT_METHODS.find(m => m.id === selectedPayment.value)
    : null;
  
  const message = method
    ? `¡Interés confirmado!\n\nMétodo de pago seleccionado: ${method.label}\n\nTe contactaremos pronto para completar la compra.`
    : 'Por favor selecciona un método de pago.';
  
  alert(message);
}

/* ============================================================
   Sistema de Navegación entre Vistas
   ============================================================ */

function switchView(viewName, roomIndex = null){
  // Ocultar todas las vistas
  Object.values(views).forEach(v => {
    v.style.display = 'none';
    v.style.opacity = '0';
  });
  
  // Mostrar vista seleccionada con animación
  const targetView = views[viewName];
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
  } else if(viewName === 'room' && roomIndex !== null){
    history.pushState(null, '', `#/sala/${roomIndex}`);
  } else if(viewName === 'purchase' && currentHotspotData){
    const roomId = currentHotspotData.roomId !== undefined ? currentHotspotData.roomId : currentRoomIndex;
    const artId = currentHotspotData.artIndex !== undefined ? currentHotspotData.artIndex : currentHotspotData.id;
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
    switchView('about');
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
        // Buscar la obra
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
    const book = BOOKS.find(b => b.id === bookId);

    if(book){
      currentHotspotData = {...book, isBook: true};
      navigateToPurchase(book);
    }
  }
  
  // Actualizar estado activo en menú
  updateActiveNavLink();
}

function updateActiveNavLink(){
  const hash = window.location.hash;
  
  // Remover clase active de todos los links
  document.querySelectorAll('.nav-links a').forEach(a => {
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
  const activeLink = document.querySelector(`.nav-links a[data-nav="${activeNav}"]`);
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

// Hash routing
window.addEventListener('hashchange', handleHashChange);
window.addEventListener('popstate', handleHashChange);

/* ============================================================
   Custom Cursor
   ============================================================ */

const cursor = document.getElementById('cursor');
const isTouch = window.matchMedia('(max-width: 860px)').matches;

if(!isTouch){
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

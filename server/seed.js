const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Función auxiliar para extraer valor numérico de precio en formato "Q3,500"
function parsePriceToAmount(priceString) {
  if (!priceString) return 0;
  // Remover "Q" y comas, luego convertir a entero
  const numericString = priceString.replace(/[^0-9]/g, '');
  return parseInt(numericString, 10) || 0;
}

// Datos existentes del frontend (se migrarán a la base de datos)
const PHOTO_SCENES = [
  {
    name: "Sala I",
    theme: "Instalación textil",
    image: "images/sala-trapos.jpeg",
    hotspots: [
      {
        id: "photo-0-0",
        left: 11.5, top: 35, width: 9, height: 13,
        title: "Vestigio Morado", artist: "Balam", year: "2025",
        medium: "Tela teñida intervenida", dims: "40 × 20 cm", price: "Q3,500",
        desc: "Prenda teñida a mano, suspendida como piel descartada. Parte de una serie sobre objetos cotidianos convertidos en reliquia."
      },
      {
        id: "photo-0-1",
        left: 31, top: 25, width: 13, height: 27,
        title: "Vestigio Rojo", artist: "Balam", year: "2025",
        medium: "Tela teñida intervenida", dims: "55 × 25 cm", price: "Q3,750",
        desc: "El rojo satura la tela hasta el punto de tensión. Un hilo desciende desde la prenda hasta un ovillo en el piso, conectando ambas piezas."
      },
      {
        id: "photo-0-2",
        left: 52, top: 34, width: 14, height: 41,
        title: "Vestigio Verde", artist: "Balam", year: "2025",
        medium: "Tela teñida intervenida", dims: "60 × 30 cm", price: "Q3,750",
        desc: "La prenda más larga de la serie, casi rozando el piso. Su hilo conductor continúa hasta la mesa de ovillos de la sala contigua."
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
        left: 30, top: 26, width: 35, height: 25,
        title: "Origen (Esfera de hilo)", artist: "Balam", year: "2025",
        medium: "Instalación — hilo tejido sobre estructura esférica", dims: "70 cm diámetro", price: "Q25,000",
        desc: "Pieza central de la instalación: kilómetros de hilo de colores tejidos a mano hasta formar una esfera densa. Los hilos sobrantes descienden hasta ovillos individuales dispuestos bajo la mesa."
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
        left: 25, top: 30, width: 20, height: 30,
        title: "Tortilla y Luna A", artist: "Balam", year: "2025",
        medium: "Grafito sobre papel acuarela", dims: "12 × 9 cm", price: "Q1,400",
        desc: "Estudio en miniatura de la serie lunar. El grafito construye la superficie de la tortilla como si fuese un cuerpo celeste."
      },
      {
        id: "photo-2-1",
        left: 55, top: 35, width: 18, height: 25,
        title: "Tortilla y Luna B", artist: "Balam", year: "2025",
        medium: "Grafito sobre papel acuarela", dims: "17 × 12 cm", price: "Q1,700",
        desc: "Segunda variación de la serie: una tortilla retratada con el detalle y la reverencia de un mapa lunar."
      }
    ]
  }
];

const ROOMS = [
  {
    name: "Sala IV",
    theme: "El deshielo",
    artworks: [
      {
        id: "room-04-0",
        title: "Marea Interior", artist: "Lucía Bravo", year: "2023",
        medium: "Óleo sobre lienzo", dims: "90 × 120 cm", price:"Q14,500",
        desc: "Capas de azul profundo y blanco roto construyen un oleaje detenido a mitad de movimiento. Bravo trabaja el óleo casi como sedimento, dejando que cada pasada seque antes de la siguiente.",
        palette: ["#1e3a5f","#3d6b8a","#eae3d3"], image: ""
      },
      {
        id: "room-04-1",
        title: "Fragmento Solar", artist: "Emiliano Ríos", year: "2022",
        medium: "Acrílico y hoja de oro sobre madera", dims: "70 × 70 cm", price:"Q18,800",
        desc: "Un disco de pan de oro se fractura sobre un fondo terracota. Ríos explora la luz como material físico, no como efecto de color.",
        palette: ["#8a3b2b","#c9a227","#2b1a12"], image: ""
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

const PAYMENT_METHODS = [
  { id: "card", label: "Tarjeta de crédito o débito", icon: "💳" },
  { id: "transfer", label: "Transferencia bancaria", icon: "🏦" },
  { id: "cash", label: "Pago contra entrega", icon: "📦" }
];

const CATEGORY_PLACEHOLDERS = {
  pintura: "Próximamente encontrarás aquí piezas en óleo, acrílico y técnica mixta de nuestros artistas.",
  dibujo: "Próximamente encontrarás aquí obras en grafito, carboncillo, pastel y otras técnicas de dibujo.",
  "tinta-china": "Próximamente encontrarás aquí obras tradicionales y contemporáneas en tinta china.",
  caricatura: "Próximamente encontrarás aquí obras de caricatura y sátira visual de nuestros artistas.",
  fotografia: "Próximamente encontrarás aquí fotografía artística, documental y experimental."
};

async function main() {
  console.log('🌱 Iniciando seed de la base de datos...');

  // En desarrollo se reconstruye todo; en producción el seed es seguro de repetir.
  if (process.env.NODE_ENV === 'development') {
    console.log('🧹 Limpiando datos existentes...');
    await prisma.order.deleteMany();
    await prisma.artwork.deleteMany();
    await prisma.book.deleteMany();
    await prisma.room.deleteMany();
    await prisma.category.deleteMany();
    await prisma.paymentMethod.deleteMany();
    await prisma.aboutContent.deleteMany();
    await prisma.user.deleteMany();
  } else {
    const existingRooms = await prisma.room.count();
    if (existingRooms > 0) {
      console.log('ℹ️ La base de datos ya contiene datos. No se ejecuta un seed destructivo en producción.');
      return;
    }
  }

  // Crear usuario administrador
  console.log('👤 Creando usuario administrador...');
  const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Administrador',
      email: process.env.ADMIN_EMAIL || 'admin@balam.gt',
      password: hashedPassword,
      role: 'ADMIN'
    }
  });
  console.log('✅ Usuario administrador creado');

  // Crear salas de PHOTO_SCENES
  console.log('🏛️ Creando salas de PHOTO_SCENES...');
  for (const scene of PHOTO_SCENES) {
    const room = await prisma.room.create({
      data: {
        name: scene.name,
        theme: scene.theme,
        imageUrl: scene.image,
        type: 'PHOTO',
        order: PHOTO_SCENES.indexOf(scene)
      }
    });

    // Crear hotspots (artworks) para esta sala
    if (scene.hotspots) {
      for (const hotspot of scene.hotspots) {
        await prisma.artwork.create({
          data: {
            id: hotspot.id,
            roomId: room.id,
            title: hotspot.title,
            artist: hotspot.artist,
            year: hotspot.year,
            medium: hotspot.medium,
            dims: hotspot.dims,
            price: hotspot.price,
            priceAmount: parsePriceToAmount(hotspot.price),
            description: hotspot.desc,
            hotspotLeft: hotspot.left,
            hotspotTop: hotspot.top,
            hotspotWidth: hotspot.width,
            hotspotHeight: hotspot.height
          }
        });
      }
    }
  }
  console.log('✅ Salas de PHOTO_SCENES creadas');

  // Crear salas de ROOMS (con gradientes)
  console.log('🎨 Creando salas de ROOMS...');
  for (const roomData of ROOMS) {
    const room = await prisma.room.create({
      data: {
        name: roomData.name,
        theme: roomData.theme,
        type: 'GRADIENT',
        order: PHOTO_SCENES.length + ROOMS.indexOf(roomData)
      }
    });

    // Crear artworks para esta sala
    if (roomData.artworks) {
      for (const artwork of roomData.artworks) {
        await prisma.artwork.create({
          data: {
            id: artwork.id,
            roomId: room.id,
            title: artwork.title,
            artist: artwork.artist,
            year: artwork.year,
            medium: artwork.medium,
            dims: artwork.dims,
            price: artwork.price,
            priceAmount: parsePriceToAmount(artwork.price),
            description: artwork.desc
          }
        });
      }
    }
  }
  console.log('✅ Salas de ROOMS creadas');

  // Crear libros
  console.log('📚 Creando libros...');
  for (const book of BOOKS) {
    await prisma.book.create({
      data: {
        id: book.id,
        title: book.title,
        author: book.author,
        year: book.year,
        description: book.desc,
        price: book.price,
        priceAmount: parsePriceToAmount(book.price)
      }
    });
  }
  console.log('✅ Libros creados');

  // Crear categorías
  console.log('🏷️ Creando categorías...');
  for (const [slug, description] of Object.entries(CATEGORY_PLACEHOLDERS)) {
    const categoryNames = {
      pintura: 'Pintura',
      dibujo: 'Dibujo',
      'tinta-china': 'Tinta China',
      caricatura: 'Caricatura',
      fotografia: 'Fotografía'
    };
    
    await prisma.category.create({
      data: {
        slug,
        name: categoryNames[slug] || slug,
        description
      }
    });
  }
  console.log('✅ Categorías creadas');

  // Crear métodos de pago
  console.log('💳 Creando métodos de pago...');
  for (const method of PAYMENT_METHODS) {
    await prisma.paymentMethod.create({
      data: {
        id: method.id,
        label: method.label,
        icon: method.icon,
        active: true
      }
    });
  }
  console.log('✅ Métodos de pago creados');

  // Crear contenido "Acerca de nosotros"
  console.log('ℹ️ Creando contenido "Acerca de nosotros"...');
  await prisma.aboutContent.create({
    data: {
      title: 'Acerca de BALAM',
      description: 'BALAM es una galería de arte virtual dedicada a promover el arte contemporáneo guatemalteco.',
      address: 'Ciudad de Guatemala, Guatemala',
      phone: '+502 2222-2222',
      email: 'info@balam.gt',
      hours: 'Lunes a Viernes: 10:00 - 18:00'
    }
  });
  console.log('✅ Contenido "Acerca de nosotros" creado');

  console.log('🎉 Seed completado exitosamente!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

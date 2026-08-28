# UMBRAL - Galería de Arte Virtual

Galería de arte virtual con navegación SPA (Single Page Application) usando hash routing, GSAP para animaciones y diseño responsivo.

## 📁 Estructura del Proyecto

```
umbral-art-gallery/
├── index.html          # HTML principal
├── css/
│   └── styles.css      # Estilos CSS
├── js/
│   └── main.js         # Lógica JavaScript
├── images/             # Imágenes de las salas
├── package.json        # Dependencias y scripts
└── README.md          # Este archivo
```

## 🚀 Instalación y Ejecución Local

1. Clonar o descargar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Iniciar servidor local:
   ```bash
   npm start
   ```
4. Abrir en el navegador: `http://localhost:3000`

## 📦 Despliegue en Render

### Opción 1: Static Site (Recomendado)

1. Crear cuenta en [render.com](https://render.com)
2. Crear nuevo "Static Site"
3. Conectar el repositorio de GitHub
4. Configurar:
   - **Build Command**: `npm install`
   - **Publish Directory**: `.`
   - **Publish File**: `index.html`

### Opción 2: Web Service

1. Crear nuevo "Web Service" en Render
2. Conectar el repositorio de GitHub
3. Configurar:
   - **Build Command**: `npm install`
   - **Start Command**: `npx serve . -p $PORT`

## 🎨 Características

- **Navegación SPA**: Sistema de routing por hash (#/inicio, #/colecciones, #/libros, #/nosotros)
- **Animaciones GSAP**: Transiciones suaves entre vistas
- **Responsive Design**: Adaptado para móvil y desktop
- **Menú Hamburguesa**: Navegación móvil optimizada
- **Vistas**:
  - Landing page con hero
  - Selector de salas (Colecciones)
  - Vista de sala con hotspots interactivos
  - Detalle de compra con métodos de pago
  - Catálogo de libros
  - Página "Acerca de nosotros"

## 📝 Edición de Datos

Los datos de la galería se encuentran en `js/main.js`:

- `PHOTO_SCENES`: Salas con fotos reales y hotspots
- `ROOMS`: Salas de relleno con gradientes
- `BOOKS`: Catálogo de libros/publicaciones
- `PAYMENT_METHODS`: Métodos de pago disponibles

## 🖼️ Imágenes

Las imágenes de las salas deben colocarse en la carpeta `images/`:
- `sala-trapos.jpeg`
- `sala-esfera.jpeg`
- `sala de tortillas.jpeg`

## 🎯 Tecnologías

- HTML5
- CSS3 (Variables CSS, Flexbox, Grid)
- JavaScript (Vanilla ES6+)
- GSAP 3.12.5 (Animaciones)
- ScrollTrigger (GSAP Plugin)

## 📱 Responsive

El sitio está optimizado para:
- Desktop: > 760px
- Tablet: 760px - 860px
- Mobile: < 860px

## 🔧 Personalización

### Colores
Editar las variables CSS en `css/styles.css`:
```css
:root{
  --wall:#1b2620;        /* Fondo principal */
  --ivory:#EDE8DD;       /* Texto principal */
  --brass:#c9a227;       /* Acentos dorados */
  --stone:#a9a79c;       /* Texto secundario */
}
```

### Tipografías
Las tipografías se cargan desde Google Fonts:
- Fraunces (Títulos)
- Space Grotesk (Texto)
- JetBrains Mono (Código/etiquetas)

## 📄 Licencia

MIT

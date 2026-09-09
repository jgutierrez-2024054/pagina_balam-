<<<<<<< HEAD
# BALAM — Galería de Arte Virtual

BALAM es una galería de arte virtual SPA. El frontend conserva HTML/CSS/JavaScript vanilla + GSAP, pero todo el contenido editable se almacena en PostgreSQL y se administra mediante una API REST y un panel protegido.

## Stack
- Frontend: HTML, CSS, JavaScript vanilla, GSAP/ScrollTrigger.
- Backend: Node.js + Express.
- Base de datos: PostgreSQL + Prisma ORM.
- Autenticación: JWT + bcryptjs.
- Roles: `ADMIN` y `CLIENT`.

## Estructura
```text
index.html
css/styles.css
js/main.js
server/index.js
server/middleware/auth.js
server/seed.js
prisma/schema.prisma
prisma/migrations/
images/
uploads/
.env.example
```

## Ejecutar localmente
1. Instala Node.js 18+.
2. Instala dependencias:
```bash
npm install
```
3. Copia `.env.example` como `.env` y cambia `JWT_SECRET`.
4. Levanta PostgreSQL con Docker:
```bash
docker compose up -d postgres
```
5. Genera Prisma y aplica migraciones:
```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```
6. Carga el contenido inicial:
```bash
npm run prisma:seed
```
7. Inicia BALAM:
```bash
npm run dev
```
Abre `http://localhost:3000`.

### Credenciales iniciales
- Usuario: `admin@balam.gt`
- Contraseña: `admin123`

**Cambia `ADMIN_PASSWORD` antes de usar producción.** El seed usa esa variable al crear el administrador.

## Panel de administración
El acceso público se encuentra en el botón **Administración** de la barra superior (ruta `#admin-login`) y el backend protege cada endpoint administrativo con JWT + rol `ADMIN`.

Desde el panel se puede:
- Crear, editar y eliminar salas.
- Subir imágenes de salas o usar una URL.
- Crear, editar y eliminar obras.
- Cambiar disponibilidad de obras.
- Posicionar y redimensionar hotspots visualmente.
- Crear, editar y eliminar libros, incluyendo portada.
- Crear, editar y eliminar categorías.
- Editar el contenido de “Acerca de nosotros”.
- Crear, editar, activar/desactivar y eliminar métodos de pago.
- Consultar ventas del mes, pedidos y histórico mensual.
- Cambiar el estado de los pedidos.

## Flujo de compra
1. El visitante puede navegar sin cuenta.
2. Para confirmar interés debe iniciar sesión o registrarse.
3. Se crea un pedido `PENDING` con el precio tomado del servidor, no del navegador.
4. Una obra disponible pasa automáticamente a `RESERVED` para evitar dos pedidos simultáneos.
5. El administrador puede pasar el pedido a `CONFIRMED`, `PAID`, `DELIVERED` o `CANCELLED`.
6. Al cancelar una reserva, la obra vuelve a `AVAILABLE`; al pagar/entregar pasa a `SOLD`.

No se procesa dinero real todavía: los métodos de pago representan la intención de pago y el administrador confirma manualmente.

## Migración de datos actuales
El contenido que antes estaba en `PHOTO_SCENES`, `ROOMS`, `BOOKS`, `PAYMENT_METHODS` y `CATEGORY_PLACEHOLDERS` se conserva en `server/seed.js` para la primera carga. `js/main.js` ya no usa esos arrays: consume exclusivamente la API.

Para una base nueva en desarrollo:
```bash
npm run prisma:migrate:deploy
npm run prisma:seed
```

El seed de desarrollo reconstruye la información inicial. En producción, si ya existen salas, se detiene para evitar duplicados.

## Variables de entorno
- `DATABASE_URL`: conexión PostgreSQL.
- `JWT_SECRET`: secreto usado para firmar tokens.
- `JWT_EXPIRES_IN`: duración del token, por defecto `7d`.
- `ADMIN_EMAIL`: email del administrador inicial.
- `ADMIN_PASSWORD`: contraseña del administrador inicial.
- `NODE_ENV`: `development` o `production`.

Nunca subas `.env` al repositorio.

## Render
Para un Web Service de Node:

**Build Command**
```bash
npm install && npx prisma generate && npx prisma migrate deploy
```

**Start Command**
```bash
npm start
```

Variables mínimas:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN=7d`
- `NODE_ENV=production`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

### Imágenes subidas
Las imágenes nuevas se guardan en `uploads/`. En Render el filesystem del servicio puede ser efímero; para producción real conviene conectar posteriormente un almacenamiento persistente (Cloudinary, S3, Cloudflare R2, etc.). Las URLs externas siguen funcionando sin ese cambio.

## Seguridad y calidad
- Contraseñas con hash `bcryptjs`.
- JWT verificado también contra la base de datos.
- Endpoints administrativos protegidos en backend.
- Validación de formularios en frontend y backend.
- Sanitización del contenido antes de inyectarlo en el DOM.
- Precios recalculados desde la base de datos al crear pedidos.
- Protección contra doble reserva de una obra mediante transacción.
- `.env`, `node_modules` y archivos temporales excluidos de Git.
- Meta description, Open Graph, favicon y manifest incluidos.
=======
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
>>>>>>> 58e9064dda8a5493895615cb612e635e6299a45f

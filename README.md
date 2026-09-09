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

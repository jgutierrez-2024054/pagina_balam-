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
js/catalog.js
server/index.js
server/middleware/auth.js
server/domain/
server/seed.js
prisma/schema.prisma
prisma/migrations/
images/
uploads/
.env.example
```

## Ejecutar localmente
1. Instala Node.js 20+ y Docker Desktop para Windows.
2. Instala dependencias con `pnpm` (si usas npm, sustituye `pnpm install` por `npm install`). Si Node muestra errores de certificado al descargar paquetes en Windows, habilita el almacén de certificados del sistema para esta sesión de PowerShell:
```powershell
$env:NODE_OPTIONS="--use-system-ca"
pnpm install
```
3. Copia `.env.example` como `.env` y configura un `JWT_SECRET` aleatorio y una contraseña `ADMIN_PASSWORD` única de al menos 12 caracteres antes de cargar datos.
4. Inicia Docker Desktop y levanta solo PostgreSQL (pgAdmin no es necesario):
```bash
docker compose up -d postgres
```
5. Genera Prisma y aplica migraciones:
```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```
6. Carga el contenido inicial:
```bash
pnpm exec prisma db seed
```
7. Inicia BALAM:
```bash
pnpm dev
```
Abre `http://localhost:3000`.

Para detener PostgreSQL al terminar, ejecuta `docker compose stop postgres`. Los datos quedan guardados en el volumen de Docker.

La cuenta inicial usa el correo de `ADMIN_EMAIL` y la contraseña de `ADMIN_PASSWORD`. El seed rechaza contraseñas menores a 12 caracteres. El valor inicial de una base ya sembrada no cambia por editar `.env`; restablécelo desde la administración de la base antes de exponerla en una red.

## Panel de administración
El acceso público se encuentra en el botón **Administración** de la barra superior (ruta `#admin-login`). La sesión del navegador se guarda en una cookie `HttpOnly` `SameSite=Strict`; el backend protege los endpoints administrativos por rol `ADMIN` y limita los intentos de autenticación.

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
- Ajustar rápidamente las existencias de libros.
- Buscar pedidos por folio, cliente, correo o artículo; consultar comprobantes y agregar notas internas privadas.
- Consultar ventas del mes, pedidos, métricas agregadas de uso e histórico mensual.
- Cambiar el estado de los pedidos.

## Flujo de compra
1. El visitante puede navegar sin cuenta.
2. Para confirmar interés debe iniciar sesión o registrarse.
3. Se crea un pedido `PENDING` con el precio tomado del servidor, no del navegador.
4. Una obra disponible pasa automáticamente a `RESERVED` para evitar dos pedidos simultáneos.
5. El administrador puede pasar el pedido a `CONFIRMED`, `PAID`, `DELIVERED` o `CANCELLED`.
6. Al cancelar una reserva, la obra vuelve a `AVAILABLE`; al pagar/entregar pasa a `SOLD`.

La opción habilitada es transferencia bancaria manual. El cliente envía el pedido, recibe las instrucciones configuradas y el administrador verifica el depósito antes de marcarlo como pagado. No se procesa ni se confirma dinero automáticamente; agrega los datos bancarios reales en Administración → Métodos de Pago.

El cliente puede adjuntar un comprobante JPG, PNG, WEBP o PDF de hasta 5 MB desde **Mis pedidos**. El archivo se guarda en `private-uploads/`, fuera del contenido público, y el endpoint valida permisos de dueño/administrador y el formato real del archivo. El comprobante nunca convierte automáticamente un pedido en pagado.

El panel contabiliza búsquedas (sin guardar el texto escrito), vistas de obras e inicios de pedido en una ventana de 30 días. Los eventos no incluyen datos de cuenta ni IP y se limpian a los 90 días.

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
La recuperación de contraseña aún no envía correo: en desarrollo devuelve un token de prueba; configura un proveedor SMTP antes de habilitarla a clientes reales.
Para notificaciones de pedidos, configura `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` y, opcionalmente, `SMTP_FROM`. Sin esas credenciales, los pedidos siguen funcionando y no se envían correos.

Los comprobantes se guardan fuera de la carpeta pública, y solo el cliente dueño del pedido o el administrador puede consultarlos. En hosting con disco efímero o de solo lectura hace falta configurar almacenamiento privado persistente antes de habilitar cargas.

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
- Sesiones del navegador en cookies `HttpOnly`, encabezados Helmet y límite de intentos de autenticación.
- Historial de cambios de estado del pedido y exportación CSV protegida para administración.
- Meta description, Open Graph, favicon y manifest incluidos.

## Verificación
```bash
pnpm test
```
Las pruebas cubren transiciones de pedidos, parseo de precios y neutralización de fórmulas en exportaciones CSV.

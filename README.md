# Software Team SaaS Backend

Backend de autenticación para el piloto de SaaS de una empresa. Está desarrollado con Node.js y Express y usa almacenamiento local en archivos JSON para usuarios y sesiones.

## Descripción

Este proyecto ofrece una API REST para:

- iniciar sesión con correo y contraseña
- mantener sesiones con tokens opacos
- autenticar peticiones protegidas
- consultar el usuario autenticado
- cerrar sesión
- comprobar que el backend está disponible

La solución está pensada para un entorno inicial de prueba y no requiere base de datos externa.

## Tecnologías

- Node.js 20+
- Express 5
- JavaScript ES modules
- bcryptjs para hashing de contraseñas
- uuid para identificadores únicos
- pruebas con Node Test Runner

## Estructura del proyecto

```text
.
├── data/
│   └── users.json
├── scripts/
│   └── create-admin.js
├── src/
│   ├── app.js
│   ├── container.js
│   ├── server.js
│   ├── auth/
│   │   ├── password.js
│   │   └── token.js
│   ├── config/
│   │   └── env.js
│   ├── controllers/
│   │   └── authController.js
│   ├── middleware/
│   │   └── authenticate.js
│   ├── repositories/
│   │   └── json/
│   │       ├── jsonFileRepository.js
│   │       ├── sessionRepository.js
│   │       └── userRepository.js
│   ├── routes/
│   │   └── authRoutes.js
│   ├── services/
│   │   └── authService.js
│   └── utils/
│       └── httpError.js
├── test/
│   └── authService.test.js
├── package.json
├── README.md
└── .gitignore
```

## Requisitos

- Node.js >= 20
- npm

## Instalación

```bash
npm install
```

## Configuración

El proyecto usa variables de entorno opcionales:

```bash
PORT=3000
SESSION_TTL_HOURS=8
DATA_DIRECTORY=./data
```

- `PORT`: puerto del servidor
- `SESSION_TTL_HOURS`: duración de la sesión en horas
- `DATA_DIRECTORY`: carpeta donde se guardan los JSON de datos
- `FRONTEND_ORIGIN`: origen permitido para peticiones del frontend

## Ejecutar la aplicación

Modo producción:

```bash
npm start
```

Modo desarrollo con recarga automática:

```bash
npm run dev
```

El backend quedará disponible en:

```text
http://localhost:3000
```

## Crear administrador inicial

Para crear el primer usuario administrador:

```bash
npm run create-admin
```

Este comando:

- valida que no exista ya un administrador
- pide nombre, email y contraseña
- guarda el usuario en `data/users.json`
- genera una contraseña hasheada

> Importante: solo puede ejecutarse una vez en una base de datos nueva.

## Endpoints

### Health check

```http
GET /api/v1/health
```

Respuesta:

```json
{
  "data": {
    "status": "ok"
  },
  "message": "Backend disponible"
}
```

### Login

```http
POST /api/v1/auth/login
```

Body:

```json
{
  "email": "admin@example.com",
  "password": "secret"
}
```

Respuesta esperada:

```json
{
  "data": {
    "token": "<token-opaco>",
    "user": {
      "id": "...",
      "name": "Admin Piloto",
      "email": "admin@example.com",
      "role": "ADMINISTRADOR",
      "isActive": true,
      "isDeleted": false,
      "leaderId": null,
      "createdBy": null,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "expiresAt": "2026-09-08T12:00:00.000Z"
  },
  "message": "Inicio de sesión correcto"
}
```

### Obtener usuario autenticado

```http
GET /api/v1/auth/me
```

Headers:

```http
Authorization: Bearer <token>
```

Respuesta:

```json
{
  "data": {
    "id": "...",
    "name": "Admin Piloto",
    "email": "admin@example.com",
    "role": "ADMINISTRADOR"
  },
  "message": "Usuario autenticado"
}
```

### Logout

```http
POST /api/v1/auth/logout
```

Headers:

```http
Authorization: Bearer <token>
```

Respuesta:

```http
204 No Content
```

### Cambiar contraseña

```http
POST /api/v1/auth/change-password
Authorization: Bearer <token>
```

```json
{
  "currentPassword": "contraseña-actual",
  "newPassword": "contraseña-nueva"
}
```

El login limita los intentos repetidos por IP y correo durante una ventana temporal. La recuperación por correo requiere configurar un proveedor externo y queda simulada mediante el cambio autenticado de contraseña.

### Usuarios

Lista los usuarios no eliminados o crea líderes y programadores. Requiere autenticación.

```http
GET /api/v1/users
POST /api/v1/users
PUT /api/v1/users/:id
PATCH /api/v1/users/:id/active
DELETE /api/v1/users/:id
Authorization: Bearer <token>
```

Body para crear una persona:

```json
{
  "name": "Ana García",
  "email": "ana@example.com",
  "password": "contraseña-temporal",
  "role": "PROGRAMADOR"
}
```

Roles disponibles: `LIDER`, `PROGRAMADOR` y `DISEÑADOR`.

Solo un usuario con rol `ADMINISTRADOR` puede crear nuevos usuarios. Si un líder o programador intenta hacerlo directamente contra la API, recibirá `403 INSUFFICIENT_PERMISSIONS`.

La creación, edición y eliminación de proyectos está reservada a `ADMINISTRADOR` y `LIDER`.

### Proyectos

Lista proyectos o crea uno nuevo. Requiere autenticación.

```http
GET /api/v1/projects
POST /api/v1/projects
PUT /api/v1/projects/:id
DELETE /api/v1/projects/:id
Authorization: Bearer <token>
```

Body para crear un proyecto:

```json
{
  "name": "Portal interno",
  "description": "Proyecto de ejemplo"
}
```

### Tareas

Lista, crea y actualiza el estado de tareas. Requiere autenticación.

```http
GET /api/v1/tasks
POST /api/v1/tasks
PATCH /api/v1/tasks/:id/status
PUT /api/v1/tasks/:id
DELETE /api/v1/tasks/:id
Authorization: Bearer <token>
```

Body para crear una tarea:

```json
{
  "title": "Preparar primera entrega",
  "description": "Revisar los pendientes del equipo",
  "projectId": null,
  "assigneeId": null,
  "priority": "MEDIUM",
  "dueDate": null
}
```

Body para actualizar su estado:

```json
{
  "status": "COMPLETED"
}
```

Estados disponibles: `TODO`, `IN_PROGRESS`, `PENDING_REVIEW` y `COMPLETED`.

Los programadores y diseñadores solo reciben las tareas asignadas a su usuario y pueden enviarlas a `PENDING_REVIEW`. La aprobación final (`COMPLETED`) solo puede realizarla un `LIDER` o un `ADMINISTRADOR`. Las devoluciones desde revisión requieren un motivo y se guardan en el historial de la tarea.

Los programadores y diseñadores solo reciben las tareas asignadas a su usuario y pueden enviarlas a `PENDING_REVIEW`. La aprobación final (`COMPLETED`) solo puede realizarla un `LIDER` o un `ADMINISTRADOR`.

## Autenticación

Las rutas protegidas usan un middleware que valida el token enviado en la cabecera `Authorization`:

```http
Authorization: Bearer <token>
```

Si la sesión es inválida, expirada o no existe, la API devuelve un error `401` con el siguiente formato:

```json
{
  "error": {
    "code": "INVALID_SESSION",
    "message": "La sesión no es válida o ha expirado",
    "details": {}
  }
}
```

## Pruebas

Ejecuta las pruebas del proyecto:

```bash
npm test
```

La suite actual comprueba la creación, autenticación y revocación de una sesión.

## Consideraciones

- Los datos se almacenan en archivos JSON dentro de `data/`.
- No se usa una base de datos relacional ni noSQL.
- Este backend está pensado como base para una primera versión funcional y pruebas de integración.

## Licencia

Este proyecto no especifica licencia en este momento.

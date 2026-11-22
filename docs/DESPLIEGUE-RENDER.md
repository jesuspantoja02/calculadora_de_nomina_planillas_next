# Despliegue en Render (plan Free) — Nómina Unidad 3 final

Guía paso a paso para publicar el monorepo **actual** ([Unidad 3 final](../README.md#-unidad-3-final--nextjs-exports-asistente-y-cierre-de-producto) en el README) en [Render](https://render.com) con el **plan gratuito**:

- **Web Service** → API Node.js (`backend/`)
- **Web Service** → App **Next.js 16** (`frontend/`, Pages Router)

Replica en la nube lo que haces en local con `npm run dev:backend` (`:3000`) y `npm run dev:frontend` (`:3001`): **dos URLs públicas**, **CORS** en la API, **`NEXT_PUBLIC_API_URL`** en el build de Next y, opcionalmente, **`AI_*`** en el backend para el asistente.

---

## Tabla de contenidos

1. [Qué vas a obtener](#1-qué-vas-a-obtener)
2. [Requisitos previos](#2-requisitos-previos)
3. [Limitaciones del plan Free (léelas antes)](#3-limitaciones-del-plan-free-léelas-antes)
4. [Arquitectura en Render](#4-arquitectura-en-render)
5. [Preparar el código](#5-preparar-el-código)
6. [Subir el proyecto a GitHub](#6-subir-el-proyecto-a-github)
7. [Crear cuenta y conectar GitHub en Render](#7-crear-cuenta-y-conectar-github-en-render)
8. [Desplegar la API (Web Service)](#8-desplegar-la-api-web-service)
9. [Comprobar que la API funciona](#9-comprobar-que-la-api-funciona)
10. [Probar la API en JSON (login y token)](#10-probar-la-api-en-json-login-y-token)
11. [Datos de demostración (opcional)](#11-datos-de-demostración-opcional)
12. [Desplegar el frontend Next.js (Web Service)](#12-desplegar-el-frontend-nextjs-web-service)
13. [Ajustar CORS con la URL final del frontend](#13-ajustar-cors-con-la-url-final-del-frontend)
14. [Prueba final de la aplicación](#14-prueba-final-de-la-aplicación)
15. [Variables de entorno (referencia)](#15-variables-de-entorno-referencia)
16. [Solución de problemas](#16-solución-de-problemas)
17. [Mantenimiento y redespliegues](#17-mantenimiento-y-redespliegues)
18. [Asistente IA en producción](#18-asistente-ia-en-producción)

---

## 1. Qué vas a obtener

| Servicio en Render | Carpeta del repo | URL ejemplo |
|--------------------|------------------|-------------|
| Web Service (API) | `backend/` | `https://nomina-api-xxxx.onrender.com` |
| Web Service (Next) | `frontend/` | `https://nomina-web-xxxx.onrender.com` |

El navegador carga Next desde su Web Service. Las peticiones van a la API (`https://nomina-api-xxxx.onrender.com/api/v1/...`). Casi todos los endpoints requieren **JWT** tras `POST /auth/login`. El chat del asistente usa `POST /api/v1/asistente/chat` (misma API, clave `AI_API_KEY` solo en el servidor).

---

## 2. Requisitos previos

- Cuenta en **GitHub** con el repositorio actualizado (rama `main` con `backend/` y `frontend/`).
- Cuenta en **Render** (registro con GitHub es lo más cómodo).
- En tu PC (para probar antes de subir):
  - **Node.js ≥ 22.18** (igual que `backend/package.json` → `engines.node`).
  - Haber ejecutado al menos una vez:

    ```bash
    npm run install:all
    npm run dev:backend
    npm run dev:frontend
    ```

    y confirmar que la app funciona en `http://localhost:3001` (login incluido).

**No subas a GitHub:**

- `node_modules/`
- `backend/data/nomina.db` y archivos `*.db-wal` / `*.db-shm`
- `.env` con secretos (sí puedes subir `backend/.env.example` y `frontend/.env.example`)

Eso ya está cubierto por el `.gitignore` del repositorio.

---

## 3. Limitaciones del plan Free (léelas antes)

| Tema | Comportamiento |
|------|----------------|
| **Inactividad** | Cada Web Service se **apaga** tras ~15 minutos sin tráfico. La primera visita después puede tardar **30–90 segundos** (cold start). |
| **SQLite** | La base `data/nomina.db` vive en el **disco del contenedor**. En el plan Free, al **redesplegar** o en algunos reinicios **puedes perder los datos**. Usa datos de prueba, `npm run seed` o vuelve a cargar desde la UI. |
| **Dos dominios** | Frontend y API no comparten origen; configura **CORS** en el backend y **`NEXT_PUBLIC_API_URL`** en el build de Next. |
| **HTTPS** | Render provee HTTPS; usa `https://` en CORS y en `NEXT_PUBLIC_API_URL`. |
| **Autenticación** | La API exige `Authorization: Bearer <token>` en rutas protegidas. El token lo devuelve el login; la app lo guarda en `sessionStorage`. |
| **Asistente IA** | Sin `AI_API_KEY` en el backend el FAB abre pero el chat falla al enviar. La clave **nunca** va en el frontend. |
| **Fotos / logo** | Perfil y logo van en JSON como data URL; el límite del cuerpo es **1 MB** (`express.json` en `backend/src/app.ts`). |
| **Configuración** | `PUT /configuracion` y reinicio de datos exigen rol gestor (`admin` / `jefe` / `gerente`). |

Para un proyecto de curso y demo, estas limitaciones suelen ser aceptables.

---

## 4. Arquitectura en Render

```text
Usuario
   │
   ▼
┌─────────────────────────────────────┐
│  Web Service (Next.js)               │  https://nomina-web-xxxx.onrender.com
│  React 19 + Pages Router             │
└─────────────────────────────────────┘
   │  fetch → https://nomina-api-xxxx.onrender.com/api/v1/...
   │  (Bearer token tras login)
   ▼
┌─────────────────────────────────────┐
│  Web Service (Node + Express 5)      │  https://nomina-api-xxxx.onrender.com
│  SQLite: backend/data/nomina.db      │
└─────────────────────────────────────┘
```

En **desarrollo local**, Next reescribe `/api` hacia el puerto 3000 (`frontend/next.config.ts`) y `apiUrl` es `/api/v1` (`frontend/src/config/environment.ts`). En **Render no hay ese rewrite hacia localhost**: el build de Next debe recibir la URL absoluta de la API con **`NEXT_PUBLIC_API_URL`**.

---

## 5. Preparar el código

El frontend lee la URL de la API así:

```typescript
// frontend/src/config/environment.ts
apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '/api/v1',
```

- **Local:** no hace falta `NEXT_PUBLIC_API_URL` (rewrite de Next hacia Express).
- **Render:** defines `NEXT_PUBLIC_API_URL` en el dashboard del servicio Next (sección 12), **no** en un `.env` commiteado con secretos.

### 5.1 Verificar el build en local

```bash
cd frontend
npm install
npm run build
```

Salida esperada de Next: carpeta `frontend/.next/`.

Opcional: probar el build apuntando a tu API de Render:

```bash
# PowerShell
$env:NEXT_PUBLIC_API_URL="https://TU-API.onrender.com/api/v1"
npm run build
npm run start
```

---

## 6. Subir el proyecto a GitHub

1. Crea el repositorio en GitHub (vacío o con README).
2. En la raíz del monorepo:

   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

Render leerá `backend/` y `frontend/` desde la rama conectada (normalmente `main`).

---

## 7. Crear cuenta y conectar GitHub en Render

1. Entra en [https://dashboard.render.com](https://dashboard.render.com).
2. Regístrate o inicia sesión (botón **Get Started** / **Sign In**).
3. Conecta tu cuenta de **GitHub** cuando Render lo pida.
4. Autoriza a Render para acceder al repositorio de este proyecto (puedes limitar solo a ese repo).

---

## 8. Desplegar la API (Web Service)

### 8.1 Crear el servicio

1. En el dashboard: **New +** → **Web Service**.
2. Selecciona tu repositorio.
3. Rama: **`main`**.

### 8.2 Configuración del formulario

| Campo | Valor |
|--------|--------|
| **Name** | `nomina-api` (define el subdominio `.onrender.com`) |
| **Region** | Cercano a Perú: **Oregon (US West)** |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | **Node** |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |

### 8.3 Variables de entorno (primera pasada)

En **Environment** → **Add Environment Variable**:

| Key | Value (ejemplo) | Notas |
|-----|-----------------|--------|
| `NODE_ENV` | `production` | Logs de acceso en la API |
| `NODE_VERSION` | `22.18.0` | Alineado con `engines` del backend |
| `CORS_ORIGINS` | `http://localhost:3001` | **Temporal**; actualiza en la sección 13 |
| `DATABASE_FILE` | `data/nomina.db` | Ruta relativa dentro de `backend/` |
| `AUTH_SECRET` | *(string aleatorio ≥ 16 caracteres)* | **Obligatorio en producción**; no uses el valor de desarrollo |
| `AUTH_TOKEN_TTL_HOURS` | `12` | Opcional |
| `RATE_LIMIT_MAX` | `300` | Opcional en producción (`1000` solo tiene sentido en local) |
| `AI_API_KEY` | *(vacío o clave Groq/OpenAI-compatible)* | **Opcional**; obligatoria para que responda el asistente |
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | Solo si usas otro proveedor compatible |
| `AI_MODEL` | `openai/gpt-oss-20b` | Modelo del proveedor (ej. Groq) |

**No definas `PORT`:** Render la inyecta; la API la lee en `backend/src/shared/config/env.ts`.

Al arrancar, si no existe el usuario admin inicial, se crea uno (usuario y clave en `backend/src/modules/auth/infrastructure/seed-usuarios.ts`). **Cambia la contraseña** desde la app tras el primer login en producción y rota `AUTH_SECRET` respecto al valor de desarrollo.

### 8.4 Health check (recomendado)

**Health Check Path:**

```text
/api/v1/health
```

### 8.5 Crear el servicio

**Create Web Service**. Render compila TypeScript (`dist/`) y arranca `node dist/main.js`. Espera estado **Live**.

### 8.6 Copiar la URL de la API

Ejemplo:

```text
https://nomina-api-xxxx.onrender.com
```

La necesitas para `NEXT_PUBLIC_API_URL` y para CORS.

---

## 9. Comprobar que la API funciona

Abre en el navegador (no requiere token):

```text
https://TU-SERVICIO-API.onrender.com/api/v1/health
```

Respuesta esperada:

```json
{
  "data": {
    "estado": "ok",
    "hora": "2026-..."
  }
}
```

Si falla: revisa **Logs**, **Root Directory** = `backend`, **Start Command** = `npm start`.

---

## 10. Probar la API en JSON (login y token)

La API **no** muestra empleados en la raíz del dominio. Para ver JSON:

1. **Login** (público):

   ```http
   POST https://TU-SERVICIO-API.onrender.com/api/v1/auth/login
   Content-Type: application/json

   {"usuario":"tu_usuario","password":"tu_clave"}
   ```

   Respuesta: `data.token`, `data.id`, `data.usuario`, `data.rol`.

2. **Listar empleados** (protegido):

   ```http
   GET https://TU-SERVICIO-API.onrender.com/api/v1/empleados
   Authorization: Bearer <data.token>
   ```

**PowerShell:**

```powershell
$base = "https://TU-SERVICIO-API.onrender.com/api/v1"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType "application/json" -Body '{"usuario":"TU_USUARIO","password":"TU_CLAVE"}'
Invoke-RestMethod -Uri "$base/empleados" -Headers @{ Authorization = "Bearer $($login.data.token)" }
```

Desde el **frontend desplegado**, tras iniciar sesión, el token está en `sessionStorage` (`nomina_auth_token`); la app añade el header `Authorization` automáticamente (`frontend/src/shared/infrastructure/http/apiClient.ts`).

CORS no aplica a curl/Postman/PowerShell; solo al navegador.

---

## 11. Datos de demostración (opcional)

`backend/scripts/seed.ts` crea empleados de ejemplo.

En el Web Service → **Shell** (si está disponible):

```bash
npm run seed
```

También puedes dar de alta datos desde la UI una vez desplegado el frontend.

Tras un redeploy, la base SQLite puede quedar vacía otra vez.

---

## 12. Desplegar el frontend Next.js (Web Service)

Next.js no se publica como Static Site en este repo (usa servidor Node con `next start`).

### 12.1 Variable de entorno del build

Necesitas la URL de la API del paso 8.6. En el Web Service de Next, **antes o al crear**:

| Key | Value |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://nomina-api-xxxx.onrender.com/api/v1` |

Sin barra final después de `v1`. Debe incluir el prefijo `/api/v1`.

### 12.2 Crear el Web Service

1. **New +** → **Web Service**.
2. Mismo repositorio y rama **`main`**.

| Campo | Valor |
|--------|--------|
| **Name** | `nomina-web` |
| **Branch** | `main` |
| **Root Directory** | `frontend` |
| **Runtime** | **Node** |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npx next start -p $PORT` |
| **Instance Type** | **Free** |

El script local `npm run start` fija el puerto `3001`; en Render usa **`$PORT`** como arriba (no `npm start` sin adaptar).

Define también `NODE_VERSION` = `22.18.0` (o compatible) y `NEXT_PUBLIC_API_URL` como en 12.1. El build ejecuta `next build --webpack` (ver `frontend/package.json`).

### 12.3 Desplegar

**Create Web Service**. URL pública ejemplo:

```text
https://nomina-web-xxxx.onrender.com
```

---

## 13. Ajustar CORS con la URL final del frontend

La API solo acepta orígenes en `CORS_ORIGINS` (`backend/src/app.ts`, `env.ts`).

1. Web Service **nomina-api** → **Environment**.
2. Edita `CORS_ORIGINS` (sin barra final):

```text
https://nomina-web-xxxx.onrender.com
```

3. Para seguir probando en local:

```text
http://localhost:3001,https://nomina-web-xxxx.onrender.com
```

4. Guarda → Render redespliega la API.

---

## 14. Prueba final de la aplicación

1. Abre `https://nomina-web-xxxx.onrender.com/login`.
2. Si la API estaba dormida, espera y recarga (cold start 30–90 s).
3. **Inicia sesión** (sin login no hay token ni datos).
4. DevTools → **Network**: peticiones a `https://nomina-api-xxxx.onrender.com/api/v1/...` con status **200** / **201** y header `Authorization` tras el login.
5. Flujos del temario base: empleados, procesar pago (+ simulación), boletas, dashboard.

### 14.1 Checklist Unidad 3 final (cierre de producto)

| Área | Qué probar |
|------|------------|
| **Empleados** | Alta/edición; export **CSV** (UTF-8) y **Excel `.xlsx`** (tabla con filtros). |
| **Boletas** | Listado; **PDF** o impresión de boleta. |
| **Dashboard** | Gráficos cargan con datos. |
| **Configuración** | Solo visible si tu rol es gestor; tasas **AFP por administradora**; logo empresa. |
| **Usuarios** | Gestor da de alta; admin lista/edita; **foto de perfil** en alta y en el sheet de perfil (`PATCH /auth/me`). |
| **Tema** | Alternar claro/oscuro en el sidebar. |
| **Asistente** | FAB (esquina); pregunta sobre planilla — requiere `AI_API_KEY` en la API (sección 18). |

| Síntoma | Causa probable |
|---------|----------------|
| Error CORS | `CORS_ORIGINS` no coincide exactamente con la URL del frontend |
| Peticiones a `tu-web.onrender.com/api/...` | Falta o está mal `NEXT_PUBLIC_API_URL`; redeploy del frontend |
| **401** en la API | Sin login o token expirado (`AUTH_TOKEN_TTL_HOURS`) |
| **403** en configuración | Usuario sin rol gestor |
| API lenta tras inactividad | Cold start del plan Free |
| Lista vacía tras redeploy | SQLite efímero; seed o altas manuales |
| Asistente sin respuesta | `AI_API_KEY` vacía o proveedor rechaza la clave |
| **413** o error al guardar foto | Imagen demasiado grande; recortar (límite ~400 KB en cliente, 1 MB en API) |

---

## 15. Variables de entorno (referencia)

### Backend (`backend/.env.example` → Zod en `env.ts`)

| Variable | Obligatoria en Render | Descripción |
|----------|------------------------|-------------|
| `NODE_ENV` | Recomendada | `production` |
| `PORT` | No (Render la define) | Puerto de escucha |
| `CORS_ORIGINS` | **Sí** | Orígenes del frontend, separados por coma |
| `DATABASE_FILE` | Recomendada | Ruta del archivo SQLite |
| `AUTH_SECRET` | **Sí** | Firma de tokens JWT |
| `AUTH_TOKEN_TTL_HOURS` | Opcional | Caducidad del token (default 12) |
| `RATE_LIMIT_MAX` | Opcional | Límite por IP / 15 min (default prod. 300) |
| `AI_API_KEY` | Para asistente | Clave API del proveedor LLM; no commitear |
| `AI_BASE_URL` | Opcional | Default Groq OpenAI-compatible |
| `AI_MODEL` | Opcional | ID del modelo en el proveedor |
| `NODE_VERSION` | Recomendada | `22.18.0` o compatible |

### Frontend (Web Service Next en Render)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NEXT_PUBLIC_API_URL` | **Sí** | URL base de la API, ej. `https://nomina-api-xxxx.onrender.com/api/v1` |

Se embebe en el bundle en el momento del build; si cambias la URL de la API, **redespliega el frontend**.

---

## 16. Solución de problemas

### Build del backend falla

- Local: `cd backend && npm run build`.
- Node: `NODE_VERSION=22.18.0`.
- Si falta `@types/node` en el build: el backend lleva TypeScript en `dependencies`; prueba **Build Command** `npm install --include=dev && npm run build`.

### Build del frontend falla

- Local: `cd frontend && npm run build`.
- Revisa que `next build` termine sin errores.

### La API responde pero el front no carga datos

1. `/api/v1/health` en el navegador.
2. CORS en consola.
3. `NEXT_PUBLIC_API_URL` correcta y **nuevo deploy** del frontend tras cambiarla.
4. Sesión iniciada (token en `sessionStorage`).

### En el navegador, `/api/v1/empleados` devuelve `NO_AUTENTICADO`

Es **comportamiento correcto**. Esa ruta (y casi todo bajo `/api/v1` salvo `/health` y `POST /auth/login`) exige el header `Authorization: Bearer <token>`. Abrir la URL en la barra de direcciones **no** envía ese header.

Para ver el JSON de empleados:

- **PowerShell** (sección 10): login → `Invoke-RestMethod` a `/empleados` con el token.
- **Consola del navegador** en tu app ya logueada:

  ```javascript
  const token = sessionStorage.getItem('nomina_auth_token');
  fetch('https://TU-API.onrender.com/api/v1/empleados', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()).then(console.log);
  ```

- **Postman** u otra herramienta HTTP con Bearer tras el login.

### Desplegar solo backend o solo frontend

Cada push a `main` redeploya el servicio conectado, o **Manual Deploy** → **Deploy latest commit**.

### Colección Postman

`docs/nomina-api.postman_collection.json`: cambia `baseUrl` a `https://TU-API.onrender.com/api/v1`. Añade primero `POST /auth/login` y usa `Bearer {{token}}` en el resto (la colección puede no incluir auth; el flujo de la sección 10 es la referencia).

### El asistente muestra error al enviar mensaje

1. En el Web Service API, confirma `AI_API_KEY` (sin espacios ni comillas extra).
2. Revisa **Logs** de la API: errores 401/429 del proveedor (clave inválida o cuota).
3. El chat solo habla con la API Express; no hace falta variable en Next.

### Helmet / recursos externos

La API usa Helmet; el frontend sirve fuentes e iconos desde el propio bundle (`@fontsource`). No se requiere CDN extra en Render.

---

## 17. Mantenimiento y redespliegues

| Acción | Qué hacer |
|--------|-----------|
| Cambio solo en API | Push → redeploy Web Service API |
| Cambio solo en Next | Push → redeploy Web Service frontend |
| Cambiar URL de API | Actualizar `NEXT_PUBLIC_API_URL` + redeploy frontend |
| Cambiar dominio del front | Actualizar `CORS_ORIGINS` + redeploy API |
| Rotar `AUTH_SECRET` | Todos los tokens vigentes invalidan; usuarios deben volver a iniciar sesión |
| Rotar o revocar `AI_API_KEY` | Solo afecta al asistente; la planilla sigue operando |

---

## 18. Asistente IA en producción

El módulo `backend/src/modules/asistente/` expone `POST /api/v1/asistente/chat` (protegido con JWT). El modelo por defecto apunta a **Groq** (`AI_BASE_URL` + `AI_MODEL` en `backend/.env.example`).

1. Crea una clave en el proveedor (ej. [Groq Console](https://console.groq.com)).
2. En Render → Web Service **nomina-api** → **Environment**:
   - `AI_API_KEY` = tu clave
   - Opcional: `AI_BASE_URL`, `AI_MODEL` si cambias de proveedor compatible con API OpenAI.
3. Redespliega la API.
4. En la web logueada, abre el FAB del asistente y envía una pregunta de prueba (“¿Qué es el adelanto quincenal?”).

**Prueba con token (PowerShell):**

```powershell
$base = "https://TU-SERVICIO-API.onrender.com/api/v1"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType "application/json" -Body '{"usuario":"TU_USUARIO","password":"TU_CLAVE"}'
$body = '{"mensaje":"Resume las tasas AFP del sistema","historial":[]}'
Invoke-RestMethod -Method Post -Uri "$base/asistente/chat" `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $($login.data.token)" } `
  -Body $body
```

Sin `AI_API_KEY`, la API puede arrancar igual; solo fallará el endpoint del asistente.

---

## Resumen rápido (checklist)

- [ ] Código en GitHub (`main`), sin `.env` ni `*.db` (véase [`.gitignore`](../.gitignore))
- [ ] Web Service `backend/` con `AUTH_SECRET` de producción y `CORS_ORIGINS`
- [ ] `/api/v1/health` responde OK; login devuelve token
- [ ] Web Service `frontend/` con `NEXT_PUBLIC_API_URL` absoluta (incluye `/api/v1`)
- [ ] `CORS_ORIGINS` incluye `https://nomina-web-....onrender.com` (y `http://localhost:3001` si sigues en local)
- [ ] Flujos Unidad 3 final probados (sección 14.1)
- [ ] Opcional: `AI_API_KEY` para el asistente (sección 18)

---

**Autor del proyecto:** Jesús Pantoja — curso JavaScript Avanzado (UTP).

Render también soporta **Blueprints** (`render.yaml` en la raíz); este repo no incluye uno aún. Esta guía usa el dashboard visual, más claro la primera vez.

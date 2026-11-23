# Despliegue en la nube (Render) — Nómina Unidad 3 final

Guía paso a paso para publicar el monorepo **actual** ([Unidad 3 final](../README.md#-unidad-3-final--nextjs-exports-asistente-y-cierre-de-producto) en el README):

| Pieza | Dónde |
|--------|--------|
| **API** Express + SQLite (`backend/`) | [Render](https://render.com) — Web Service Node (plan Free) |
| **Next.js 16** (`frontend/`, Pages Router) | [Render](https://render.com) — Web Service Node (plan Free) |

Replica en la nube lo que haces en local con `npm run dev:backend` (`:3000`) y `npm run dev:frontend` (`:3001`): **dos URLs públicas en Render**, **CORS** en la API, **`NEXT_PUBLIC_API_URL`** en el **build** del frontend y **`AI_*`** en el backend para el **asistente IA** (módulo completo de Unidad 3).

Esta guía cubre **todo el alcance del producto en producción**: autenticación JWT, roles, empleados, planilla, boletas, dashboard, configuración, usuarios con foto, exports CSV/Excel/PDF y chat del asistente vía API externa (Groq por defecto).

### Orden de despliegue recomendado

| Paso | Dónde | Qué haces |
|------|--------|-----------|
| 1 | GitHub | Push de `main` (sin `.env` ni `*.db`) |
| 2 | Render | Web Service `backend/`, variables, **Live** |
| 3 | Navegador | `GET …/api/v1/health` y `POST …/auth/login` |
| 4 | Render | Opcional: `AI_API_KEY` + redeploy; opcional: `npm run seed` en Shell |
| 5 | Render | Segundo Web Service `frontend/`, `NEXT_PUBLIC_API_URL` → deploy |
| 6 | Render | Actualizar `CORS_ORIGINS` en la API con la URL del frontend |
| 7 | Render | Checklist sección [14](#14-prueba-final-de-la-aplicación) y [21](#21-funcionalidades-del-proyecto-en-producción) |

---

## Tabla de contenidos

1. [Qué vas a obtener](#1-qué-vas-a-obtener)
2. [Requisitos previos](#2-requisitos-previos)
3. [Limitaciones del plan gratuito (léelas antes)](#3-limitaciones-del-plan-gratuito-léelas-antes)
4. [Arquitectura](#4-arquitectura)
5. [Preparar el código](#5-preparar-el-código)
6. [Subir el proyecto a GitHub](#6-subir-el-proyecto-a-github)
7. [Crear cuenta y conectar GitHub en Render](#7-crear-cuenta-y-conectar-github-en-render)
8. [Desplegar la API en Render](#8-desplegar-la-api-en-render)
9. [Comprobar que la API funciona](#9-comprobar-que-la-api-funciona)
10. [Probar la API en JSON (login y token)](#10-probar-la-api-en-json-login-y-token)
11. [Datos de demostración (opcional)](#11-datos-de-demostración-opcional)
12. [Desplegar el frontend en Render](#12-desplegar-el-frontend-en-render)
13. [Ajustar CORS con la URL final del frontend](#13-ajustar-cors-con-la-url-final-del-frontend)
14. [Prueba final de la aplicación](#14-prueba-final-de-la-aplicación)
15. [Variables de entorno (referencia)](#15-variables-de-entorno-referencia)
16. [Solución de problemas](#16-solución-de-problemas)
17. [Mantenimiento y redespliegues](#17-mantenimiento-y-redespliegues)
18. [Asistente IA en producción](#18-asistente-ia-en-producción)
19. [Otras plataformas](#19-otras-plataformas)
20. [Mapa de la API y autenticación](#20-mapa-de-la-api-y-autenticación)
21. [Funcionalidades del proyecto en producción](#21-funcionalidades-del-proyecto-en-producción)
22. [Seguridad y buenas prácticas](#22-seguridad-y-buenas-prácticas)

---

## 1. Qué vas a obtener

| Servicio | Carpeta | URL ejemplo |
|----------|---------|-------------|
| API (Render) | `backend/` | `https://nomina-api-xxxx.onrender.com` |
| Frontend (Render) | `frontend/` | `https://nomina-web-xxxx.onrender.com` |

El navegador carga Next desde Render. Las peticiones van a la API (`https://nomina-api-xxxx.onrender.com/api/v1/...`). Casi todos los endpoints requieren **JWT** tras `POST /auth/login`. El chat del asistente usa `POST /api/v1/asistente/chat` (clave `AI_API_KEY` solo en el servidor).

---

## 2. Requisitos previos

- Cuenta en **GitHub** con el repositorio actualizado (rama `main` con `backend/` y `frontend/`).
- Cuenta en **Render** (registro con GitHub es lo más cómodo; plan Free disponible; crearás **dos** Web Services en el mismo workspace).
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

## 3. Limitaciones del plan gratuito (léelas antes)

| Tema | Comportamiento |
|------|----------------|
| **Spin down (Render Free)** | Si un Web Service free pasa **~15 minutos sin tráfico**, Render lo **apaga**. La primera petición puede tardar **~1 minuto** (pantalla de carga de Render). **API y frontend** pueden dormirse por separado; tras inactividad, conviene recargar el front y esperar al despertar de la API si hace falta. |
| **Cuota Render Free** | **750 horas-instancia/mes** por workspace; si se agotan, Render **suspende** los servicios free hasta el mes siguiente (mensaje tipo *“free instance usage limit for this month”*). Revisa [límites del plan free](https://render.com/docs/free). |
| **Dos Web Services free** | Este proyecto usa **dos** servicios (API + Next). Ambos **comparten** la cuota horaria del workspace free. |
| **SQLite** | `data/nomina.db` vive en el **disco efímero** del servicio. Tras **redeploy**, **reinicio** o **spin down** **puedes perder datos**. Usa altas desde la UI, o datos de prueba locales; el admin inicial se recrea al arrancar (`seed-usuarios.ts`). |
| **Dos dominios** | Frontend y API no comparten origen; configura **CORS** en la API y **`NEXT_PUBLIC_API_URL`** en el build de Next. |
| **HTTPS** | Render provee HTTPS en ambos servicios; usa `https://` en CORS y en `NEXT_PUBLIC_API_URL`. |
| **Autenticación** | La API exige `Authorization: Bearer <token>` en rutas protegidas. El token lo devuelve el login; la app lo guarda en `sessionStorage`. |
| **Asistente IA** | Sin `AI_API_KEY` el FAB abre pero el chat falla al enviar. La clave **nunca** va en el frontend. |
| **Fotos / logo** | Perfil y logo van en JSON como data URL; el límite del cuerpo es **1 MB** (`express.json` en `backend/src/app.ts`). |
| **Configuración** | `PUT /configuracion` y reinicio de datos exigen rol gestor (`admin` / `jefe` / `gerente`). |

Para un proyecto de curso y demo, estas limitaciones suelen ser aceptables.

---

## 4. Arquitectura

```text
Usuario
   │
   ▼
┌─────────────────────────────────────┐
│  Render (Next.js 16)                 │  https://nomina-web-xxxx.onrender.com
│  React 19 + Pages Router             │
└─────────────────────────────────────┘
   │  fetch → https://nomina-api-xxxx.onrender.com/api/v1/...
   │  (Bearer token tras login; CORS en la API)
   ▼
┌─────────────────────────────────────┐
│  Render (Express 5 + Node)           │  https://nomina-api-xxxx.onrender.com
│  SQLite: backend/data/nomina.db      │
└─────────────────────────────────────┘
```

En **desarrollo local**, Next reescribe `/api` hacia el puerto 3000 (`frontend/next.config.ts`) y `apiUrl` es `/api/v1` (`frontend/src/config/environment.ts`). En **producción (Render) no hay rewrite hacia localhost**: el build de Next debe recibir la URL absoluta de la API con **`NEXT_PUBLIC_API_URL`**. Si olvidas esa variable, el cliente usará `/api/v1` y los rewrites del repo apuntan a `localhost:3000` — **la app fallará** en login y datos.

---

## 5. Preparar el código

El frontend lee la URL de la API así:

```typescript
// frontend/src/config/environment.ts
apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '/api/v1',
```

- **Local:** no hace falta `NEXT_PUBLIC_API_URL` (rewrite de Next hacia Express).
- **Render (frontend):** defines `NEXT_PUBLIC_API_URL` en el dashboard del Web Service (sección 12), **no** en un `.env` commiteado con secretos.

### 5.1 Verificar el build en local

```bash
cd frontend
npm install
npm run build
```

Salida esperada de Next: carpeta `frontend/.next/`.

Opcional: probar el build apuntando a tu API en Render:

```bash
# PowerShell
$env:NEXT_PUBLIC_API_URL="https://TU-API.onrender.com/api/v1"
npm run build
npm run start
```

### 5.2 Verificar el build del backend en local

```bash
cd backend
npm install
npm run build
npm start
```

Abre `http://localhost:3000/api/v1/health` (o el `PORT` de tu `.env`).

---

## 6. Subir el proyecto a GitHub

1. Crea el repositorio en GitHub (vacío o con README).
2. En la raíz del monorepo:

   ```bash
   git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
   git push -u origin main
   ```

En Render crearás **dos Web Services** del mismo repositorio: uno con **Root Directory** `backend/` y otro con `frontend/`.

---

## 7. Crear cuenta y conectar GitHub en Render

> **Atajo:** si prefieres no crear los dos servicios a mano, usa el [`render.yaml`](../render.yaml) del repositorio (Blueprint; ver [Resumen rápido](#resumen-rápido-checklist)). El resto de esta guía detalla el dashboard paso a paso.

1. Entra en [https://dashboard.render.com](https://dashboard.render.com).
2. Regístrate o inicia sesión (recomendado: **Sign in with GitHub**).
3. Conecta tu cuenta de **GitHub** cuando Render lo pida.
4. Autoriza a Render para acceder al repositorio de este monorepo (puedes limitar solo a ese repo).

---

## 8. Desplegar la API en Render

### 8.1 Crear el Web Service

1. En el dashboard: **New +** → **Web Service**.
2. Selecciona el repositorio del proyecto (rama **`main`**).
3. Configuración sugerida:

| Campo | Valor |
|--------|--------|
| **Name** | `nomina-api` (define el subdominio `.onrender.com`) |
| **Region** | La más cercana (p. ej. Oregon / Ohio) |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Instance Type** | **Free** |
| **Auto-Deploy** | **Yes** (redeploy al push en `main`) |

**No definas `PORT` en variables:** Render la inyecta automáticamente; la API la lee en `backend/src/shared/config/env.ts`.

En **Settings → Build & Deploy**, si Render permite fijar versión de Node, usa **22.18** o superior (alineado con `engines` en `backend/package.json`). Si no aparece en la UI, añade variable de entorno `NODE_VERSION` = `22.18.0` (según soporte actual del runtime).

### 8.2 Variables de entorno (dashboard → Environment)

No commitees secretos. Añádelos en **Environment** del servicio:

| Key | Valor ejemplo | Notas |
|-----|---------------|--------|
| `NODE_ENV` | `production` | Activa rate limit y logs de acceso |
| `DATABASE_FILE` | `data/nomina.db` | Ruta dentro del servicio |
| `AUTH_SECRET` | *(generado)* | **Obligatorio** |
| `CORS_ORIGINS` | `http://localhost:3001` | Actualiza tras desplegar el front (sección 13) |
| `AUTH_TOKEN_TTL_HOURS` | `12` | Opcional |
| `RATE_LIMIT_MAX` | `300` | Opcional |

Generar `AUTH_SECRET` en local:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**Asistente IA (recomendado para demo completa):**

| Key | Valor típico | Notas |
|-----|--------------|--------|
| `AI_API_KEY` | `gsk_…` | [Groq Console](https://console.groq.com); sin comillas en Render |
| `AI_BASE_URL` | `https://api.groq.com/openai/v1` | Omitir si usas Groq |
| `AI_MODEL` | `openai/gpt-oss-20b` | ID según catálogo del proveedor |

Sin `AI_API_KEY`, la API arranca igual; el chat devuelve error `IA_NO_CONFIGURADA` (ver sección [18](#18-asistente-ia-en-producción)).

Al arrancar, si no existe el usuario admin inicial, se crea uno (**credenciales en** `backend/src/modules/auth/infrastructure/seed-usuarios.ts`). **Obligatorio en producción:** inicia sesión, entra a tu perfil y **cambia la contraseña** (`POST /auth/cambiar-password` o UI); no dejes la clave inicial en un entorno público.

### 8.3 Desplegar

Pulsa **Create Web Service**. Render instala dependencias, ejecuta `tsc` (`dist/`) y arranca `node dist/main.js`. Espera estado **Live**.

### 8.4 Health check (opcional)

En **Settings → Health Check Path** puedes usar:

```text
/api/v1/health
```

Logs: pestaña **Logs** del servicio en el dashboard.

### 8.5 Copiar la URL de la API

En la cabecera del servicio, copia la URL pública. Ejemplo:

```text
https://nomina-api-xxxx.onrender.com
```

La necesitas para `NEXT_PUBLIC_API_URL` y para actualizar `CORS_ORIGINS`.

### 8.6 Primer acceso y roles

| Rol | Capacidades en producción |
|-----|----------------------------|
| `admin` | Todo; listar/editar/eliminar usuarios; configuración |
| `jefe` / `gerente` | Planilla, configuración, alta de usuarios (roles limitados) |
| `usuario` | Operación diaria; sin configuración ni listado global de usuarios |

El menú de **Configuración** y rutas `PUT /configuracion`, `DELETE /datos` y gestión de usuarios exigen permisos de gestor/admin según `backend/src/app.ts` y los routers de cada módulo.

---

## 9. Comprobar que la API funciona

Abre en el navegador (no requiere token):

```text
https://TU-API.onrender.com/api/v1/health
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

Si falla: revisa **Logs** en Render, confirma `AUTH_SECRET` y el resto de variables, y espera el arranque si el servicio estaba en spin down.

---

## 10. Probar la API en JSON (login y token)

La API **no** muestra empleados en la raíz del dominio. Para ver JSON:

1. **Login** (público):

   ```http
   POST https://TU-API.onrender.com/api/v1/auth/login
   Content-Type: application/json

   {"usuario":"tu_usuario","password":"tu_clave"}
   ```

   Respuesta: `data.token`, `data.id`, `data.usuario`, `data.rol`.

2. **Listar empleados** (protegido):

   ```http
   GET https://TU-API.onrender.com/api/v1/empleados
   Authorization: Bearer <data.token>
   ```

**PowerShell:**

```powershell
$base = "https://TU-API.onrender.com/api/v1"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType "application/json" -Body '{"usuario":"TU_USUARIO","password":"TU_CLAVE"}'
Invoke-RestMethod -Uri "$base/empleados" -Headers @{ Authorization = "Bearer $($login.data.token)" }
```

Desde el **frontend desplegado**, tras iniciar sesión, el token está en `sessionStorage` (`nomina_auth_token`); la app añade el header `Authorization` automáticamente (`frontend/src/shared/infrastructure/http/apiClient.ts`).

CORS no aplica a curl/Postman/PowerShell; solo al navegador.

---

## 11. Datos de demostración (opcional)

`backend/scripts/seed.ts` inserta empleados y datos de ejemplo en SQLite (idempotente en la medida que no duplique lógica conflictiva).

### 11.1 Desde la UI (recomendado en producción)

Con el front en Render y sesión iniciada: **Empleados → Alta**, luego **Procesar pago** / **Boletas** según el flujo del curso.

### 11.2 Desde Render Shell

1. Web Service **nomina-api** → pestaña **Shell** (disponible en plan Free cuando el servicio está Live).
2. El **Root Directory** ya es `backend/`; ejecuta:

   ```bash
   npm run seed
   ```

   Usa las mismas variables de entorno del servicio (`DATABASE_FILE`, etc.).

3. Si falla por Node/TS, verifica versión Node 22 en el servicio y que el script exista en el repo desplegado.

### 11.3 En local

```bash
cd backend
npm run seed
```

Solo afecta tu `data/nomina.db` local; **no** sincroniza con Render.

Tras un **redeploy** o pérdida del disco efímero en Render, la base SQLite puede quedar **vacía** otra vez (salvo admin recreado al arrancar). Repite seed, Shell o altas manuales.

---

## 12. Desplegar el frontend en Render

Necesitas la URL de la API del paso [8.5](#85-copiar-la-url-de-la-api).

### 12.1 Crear el segundo Web Service

1. En el dashboard de Render: **New +** → **Web Service**.
2. Selecciona el **mismo** repositorio y rama **`main`** que la API.
3. Configuración sugerida:

| Campo | Valor |
|--------|--------|
| **Name** | `nomina-web` (subdominio `.onrender.com`) |
| **Region** | La misma que la API (menor latencia entre servicios) |
| **Root Directory** | `frontend` |
| **Runtime** | Node |
| **Build Command** | `npm install --include=dev && npm run build` |
| **Start Command** | `npm run start:render` |
| **Instance Type** | **Free** |
| **Auto-Deploy** | **Yes** |

**Importante:** Render inyecta `PORT` en runtime. El script `npm start` del repo fija el puerto **3001** (útil en local); en Render usa **`npm run start:render`** (`frontend/package.json`), que escucha en `0.0.0.0` y el puerto `$PORT`.

Añade variable `NODE_VERSION` = `22.18.0` (o la versión de Node que uses en local) si el runtime no la ofrece en Settings.

### 12.2 Variables de entorno

En **Environment** del servicio **nomina-web**:

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_API_URL` | `https://TU-API.onrender.com/api/v1` |

Sin barra final después de `v1`. Se embebe en el bundle en el **build**; si cambia la URL del API, **vuelve a desplegar el frontend** (Manual Deploy o push a `main`).

### 12.3 Desplegar y copiar la URL

Pulsa **Create Web Service**. Espera estado **Live**. URL ejemplo:

```text
https://nomina-web-xxxx.onrender.com
```

Cada push a `main` puede redeplegar API y frontend si ambos tienen Auto-Deploy activo.

### 12.4 Health check (opcional)

En **Settings → Health Check Path** puedes usar:

```text
/login
```

### 12.5 Desarrollo local contra API en Render

Puedes dejar `NEXT_PUBLIC_API_URL` vacía en local y usar rewrites, o apuntar a Render en una terminal de prueba:

```bash
# Bash
NEXT_PUBLIC_API_URL=https://TU-API.onrender.com/api/v1 npm run dev
```

En la API, añade `http://localhost:3001` a `CORS_ORIGINS` en Render (ya debería estar). Así pruebas el front local contra API en la nube (útil para depurar IA sin redesplegar el frontend).

---

## 13. Ajustar CORS con la URL final del frontend

La API solo acepta orígenes en `CORS_ORIGINS` (`backend/src/app.ts`, `env.ts`). El valor debe coincidir **exactamente** con el origen del navegador (esquema + host + puerto si aplica, **sin** barra final ni path).

En Render → servicio **nomina-api** → **Environment**, edita `CORS_ORIGINS`:

```text
http://localhost:3001,https://nomina-web-xxxx.onrender.com
```

Sustituye `nomina-web-xxxx` por el subdominio real de tu servicio **nomina-web**. Guarda; Render redespliega la API automáticamente.

Varios orígenes van separados por **coma**, sin espacios. El valor debe coincidir **exactamente** con lo que muestra la barra del navegador (`https://`, sin `/` final).

---

## 14. Prueba final de la aplicación

1. Abre `https://TU-FRONT.onrender.com/login`.
2. Si la API estaba en spin down, espera ~1 minuto y recarga (pantalla de Render).
3. **Inicia sesión** (sin login no hay token ni datos).
4. DevTools → **Network**: peticiones a `https://TU-API.onrender.com/api/v1/...` con status **200** / **201** y header `Authorization` tras el login.
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
| Peticiones al dominio del **front** en `/api/...` (en lugar del API en Render) | Falta o está mal `NEXT_PUBLIC_API_URL`; nuevo deploy del Web Service **nomina-web** |
| **401** en la API | Sin login o token expirado (`AUTH_TOKEN_TTL_HOURS`) |
| **403** en configuración | Usuario sin rol gestor |
| API lenta tras inactividad | Spin down de Render Free; primera petición despierta el servicio |
| Lista vacía tras redeploy | SQLite efímero; altas manuales o admin recién creado |
| Asistente sin respuesta | `AI_API_KEY` vacía o proveedor rechaza la clave |
| **413** o error al guardar foto | Imagen demasiado grande; recortar (límite ~400 KB en cliente, 1 MB en API) |

---

## 15. Variables de entorno (referencia)

### Backend (`backend/.env.example` → Zod en `backend/src/shared/config/env.ts`)

| Variable | Obligatoria en Render | Default si omites | Dónde configurarla |
|----------|----------------------|-------------------|---------------------|
| `NODE_ENV` | Recomendada (`production`) | `development` | Environment |
| `PORT` | No (Render la define) | `3000` | Inyectada por Render |
| `CORS_ORIGINS` | **Sí** | `http://localhost:3001` | Environment |
| `DATABASE_FILE` | Recomendada | `data/nomina.db` | Environment |
| `AUTH_SECRET` | **Sí** | *(dev inseguro en código)* | Environment |
| `AUTH_TOKEN_TTL_HOURS` | Opcional | `12` | Environment |
| `RATE_LIMIT_MAX` | Opcional | `300` en prod. vía schema | Environment |
| `AI_API_KEY` | **Sí para asistente** | vacío → chat error 503 | Environment |
| `AI_BASE_URL` | Opcional | `https://api.groq.com/openai/v1` | Environment |
| `AI_MODEL` | Opcional | `openai/gpt-oss-20b` | Environment |
| `NODE_VERSION` | Recomendada | — | Environment (`22.18.0`) |

Referencia local: copia `backend/.env.example` → `backend/.env` para desarrollo; en Render usa solo el dashboard.

### Frontend (Render — servicio `nomina-web`)

| Variable | Obligatoria | Descripción |
|----------|-------------|-------------|
| `NODE_ENV` | Recomendada | `production` |
| `NODE_VERSION` | Recomendada | `22.18.0` (o alineado con tu Node local) |
| `NEXT_PUBLIC_API_URL` | **Sí** | URL base de la API, ej. `https://nomina-api-xxxx.onrender.com/api/v1` |
| `PORT` | No | Inyectada por Render en runtime (usar en Start Command, no fijar a mano) |

Configúralas en **Render → nomina-web → Environment**. Si cambias la URL de la API, **redespliega el frontend**.

---

## 16. Solución de problemas

### Build del backend falla en Render

- Local: `cd backend && npm run build`.
- En Render → **Logs**, revisa que `npm install && npm run build` termine sin error de TypeScript.
- Confirma **Root Directory** = `backend` y Node **22.x** si el runtime lo permite en Settings.

### Build del frontend falla en Render

- Local: `cd frontend && npm run build`.
- **Render:** confirma **Root Directory** = `frontend`; en **Logs**, que se ejecute `next build --webpack` como en `package.json`.
- **Render:** si el log dice *“do not have the required package(s) installed”* y pide `typescript` / `@types/*`, el servicio tiene `NODE_ENV=production` y `npm install` **omite devDependencies**. Usa **Build Command** `npm install --include=dev && npm run build` (no solo `npm install && npm run build`).
- **Render:** si falla la versión de Node, añade `NODE_VERSION` = `22.18.0` en Environment.
- **Render:** si el servicio arranca pero no responde, revisa que **Start Command** sea `npm run start:render` (no `npm start` con puerto fijo 3001).

### La API responde pero el front no carga datos

1. `/api/v1/health` en el navegador.
2. CORS en consola.
3. `NEXT_PUBLIC_API_URL` correcta y **nuevo deploy** del frontend tras cambiarla.
4. Sesión iniciada (token en `sessionStorage`).

### En el navegador, `/api/v1/empleados` devuelve `NO_AUTENTICADO`

Es **comportamiento correcto**. Esa ruta exige `Authorization: Bearer <token>`.

Para ver el JSON de empleados:

- **PowerShell** (sección 10).
- **Consola del navegador** en tu app ya logueada:

  ```javascript
  const token = sessionStorage.getItem('nomina_auth_token');
  fetch('https://TU-API.onrender.com/api/v1/empleados', {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json()).then(console.log);
  ```

### Redespliegues

- **Render (API):** push a `main` (auto-deploy) o **Manual Deploy** en el dashboard del servicio **nomina-api**.
- **Render (frontend):** push a `main` o **Manual Deploy** en **nomina-web**; cambiar `NEXT_PUBLIC_API_URL` requiere rebuild.

### Colección Postman

`docs/nomina-api.postman_collection.json`: cambia `baseUrl` a `https://TU-API.onrender.com/api/v1`. Flujo de login: sección 10.

### El asistente muestra error al enviar mensaje

1. En Render → **Environment**, confirma `AI_API_KEY`.
2. **Logs** del servicio — errores 401/429 del proveedor.
3. El chat solo habla con la API Express; no hace falta variable en Next.

### El servicio Render no arranca / deploy fallido

1. **Logs** del Web Service (build y runtime).
2. Comprueba variables obligatorias (`AUTH_SECRET`, `CORS_ORIGINS`).
3. **Manual Deploy** → **Clear build cache & deploy** si el build quedó corrupto.

Si el servicio free está **suspended** por cuota mensual, espera al siguiente mes o añade método de pago según la política de tu workspace.

---

## 17. Mantenimiento y redespliegues

| Acción | Qué hacer |
|--------|-----------|
| Cambio solo en API | Push a `main` o **Manual Deploy** en Render |
| Cambio solo en Next | Push → redeploy en **nomina-web** (Render) |
| Cambiar URL de API | Actualizar `NEXT_PUBLIC_API_URL` + **redeploy** frontend |
| Cambiar dominio del front | Actualizar `CORS_ORIGINS` en Render → Environment |
| Rotar `AUTH_SECRET` | Tokens vigentes invalidan; usuarios deben volver a iniciar sesión |
| Rotar `AI_API_KEY` | Solo afecta al asistente |

---

## 18. Asistente IA en producción

El asistente es parte del **cierre de producto Unidad 3**: responde en español sobre planilla, módulos de la app y normativa configurada, sin exponer claves ni llamar a modelos desde el navegador.

### 18.1 Arquitectura (frontend y API en Render)

```text
Navegador (Render — nomina-web)
  → FAB + panel (AiAsistenteFab en frontend/src/core/layout/)
  → apiPost /asistente/chat (misma NEXT_PUBLIC_API_URL + JWT)
  → Render Express (nomina-api)
  → AsistenteService + conocimiento.ts + resumen de Configuracion en vivo
  → fetch OpenAI-compatible (llm-cliente.ts) → Groq u otro proveedor
```

| Capa | Responsabilidad |
|------|-----------------|
| **Frontend** | UI del chat; envía `mensaje` + `historial` (últimos turnos) |
| **API** | Valida JWT; arma prompt de sistema; llama al LLM |
| **Proveedor** | Solo recibe peticiones del **servidor** con `AI_API_KEY` |

**Nunca** configures `AI_API_KEY` en el servicio **nomina-web** ni en variables `NEXT_PUBLIC_*`.

### 18.2 Endpoint y contrato

| | |
|--|--|
| **Ruta** | `POST /api/v1/asistente/chat` |
| **Auth** | `Authorization: Bearer <token>` (obligatorio) |
| **Body** | `{ "mensaje": string, "historial": [{ "role": "user"\|"assistant", "content": string }] }` |
| **Respuesta** | `{ "data": { "respuesta": string, "proveedor": "llm" } }` |

El servicio (`asistente.service.ts`):

- Lee **configuración actual** (RMV, UIT, tasas AFP, empresa, adelanto quincenal, etc.) y la inyecta al prompt.
- Une fragmentos de **`conocimiento.ts`** (módulos, roles, reglas de planilla).
- Recorta el historial a los **últimos 12** mensajes.
- Usa `temperature: 0.4`, `max_tokens: 900` en `llm-cliente.ts`.

### 18.3 Configurar Groq en Render (recomendado)

1. Cuenta en [Groq Console](https://console.groq.com) → **API Keys** → crear clave.
2. Render → **nomina-api** → **Environment**:

   | Key | Value |
   |-----|--------|
   | `AI_API_KEY` | tu clave `gsk_…` |
   | `AI_BASE_URL` | `https://api.groq.com/openai/v1` |
   | `AI_MODEL` | `openai/gpt-oss-20b` (o modelo compatible listado en Groq) |

3. **Save Changes** (redeploy automático).
4. Espera **Live**; si la API estaba dormida, la primera petición puede tardar ~1 min.

### 18.4 Otro proveedor OpenAI-compatible

Cualquier API con `POST …/chat/completions` y header `Authorization: Bearer`:

| Key | Ejemplo OpenAI oficial |
|-----|-------------------------|
| `AI_BASE_URL` | `https://api.openai.com/v1` |
| `AI_MODEL` | `gpt-4o-mini` |
| `AI_API_KEY` | clave del proveedor |

Ajusta modelo y URL según la documentación del proveedor; el código no cambia.

### 18.5 Errores típicos del asistente

| Código HTTP / API | Causa | Acción |
|-------------------|--------|--------|
| **503** `IA_NO_CONFIGURADA` | `AI_API_KEY` vacía en Render | Añadir clave y redeploy |
| **502** `IA_NO_DISPONIBLE` | Render no alcanza internet/proveedor | Revisar logs; reintentar |
| **502** `IA_ERROR` | Clave inválida, modelo inexistente, cuota 429 | Logs del servicio; revisar Groq dashboard |
| **401** | Sin login o token expirado | Volver a iniciar sesión en el frontend |
| Error CORS | Origen del front no está en `CORS_ORIGINS` | Sección [13](#13-ajustar-cors-con-la-url-final-del-frontend) |

En **Logs** del Web Service verás líneas JSON de acceso con `POST /api/v1/asistente/chat` y códigos de estado.

### 18.6 Probar en la aplicación (Render)

1. Login en `https://TU-FRONT.onrender.com`.
2. Botón flotante **asistente** (esquina; ver `frontend/src/styles/ai-asistente.css`).
3. Preguntas de prueba sugeridas:
   - *¿Qué es el adelanto quincenal y cómo se configura?*
   - *¿Qué roles pueden entrar a configuración?*
   - *¿Qué hace el módulo de boletas?*
4. Cambia tasas en **Configuración** (como gestor) y repite una pregunta sobre AFP: la respuesta debe alinear con la configuración viva.

### 18.7 Probar con PowerShell (API directa)

```powershell
$base = "https://TU-API.onrender.com/api/v1"
$login = Invoke-RestMethod -Method Post -Uri "$base/auth/login" `
  -ContentType "application/json" -Body '{"usuario":"TU_USUARIO","password":"TU_CLAVE"}'
$body = '{"mensaje":"Resume las tasas AFP del sistema","historial":[]}'
Invoke-RestMethod -Method Post -Uri "$base/asistente/chat" `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $($login.data.token)" } `
  -Body $body
```

Respuesta esperada: propiedad `data.respuesta` con texto en español.

### 18.8 Costes y límites del proveedor

- Groq y otros proveedores pueden tener **límites de tokens/rpm** en tier gratuito.
- El asistente **no** cachea respuestas; cada mensaje es una llamada al LLM.
- Para demo de curso, el tier gratuito de Groq suele bastar; monitoriza errores **429** en logs.

---

## 19. Otras plataformas

| Plataforma | Notas |
|------------|--------|
| **Fly.io / Railway** | API en contenedor o Node; requiere CLI o dashboard; cuotas free limitadas. |
| **VPS (Oracle Always Free, etc.)** | Mejor persistencia SQLite; más configuración manual. |
| **Túnel + local** | Cloudflare Tunnel o ngrok para demos sin hostear la API si Render está suspendido. |

El flujo de variables (`AUTH_SECRET`, `CORS_ORIGINS`, `NEXT_PUBLIC_API_URL`, `AI_*`) es el mismo; solo cambia cómo defines el entorno y el comando de deploy.

---

## 20. Mapa de la API y autenticación

Prefijo base: `https://TU-API.onrender.com/api/v1`

| Ruta | Auth | Descripción |
|------|------|-------------|
| `GET /health` | No | Estado del servicio |
| `POST /auth/login` | No | Devuelve JWT |
| `GET /auth/me` | Sí | Perfil actual |
| `PATCH /auth/me` | Sí | Actualizar perfil (foto, etc.) |
| `POST /auth/cambiar-password` | Sí | Cambio de contraseña |
| `GET/POST /usuarios…` | Sí + roles | Gestión de usuarios |
| `GET/POST/PUT/DELETE /empleados…` | Sí | CRUD empleados |
| `GET/POST /pagos…` | Sí | Planilla y boletas |
| `GET/PUT /configuracion` | Sí; PUT solo gestor | Tasas y empresa |
| `DELETE /datos` | Sí + gestor | Reinicio de datos |
| `GET /dashboard…` | Sí | Métricas para gráficos |
| `POST /asistente/chat` | Sí | Chat IA |

El token se guarda en el cliente como `nomina_auth_token` en **`sessionStorage`** (`frontend/src/shared/infrastructure/http/apiClient.ts`). Cierra sesión o caducidad (`AUTH_TOKEN_TTL_HOURS`, default **12 h**) obliga a login de nuevo.

**Rate limit:** con `NODE_ENV=production`, Express limita peticiones por IP (`RATE_LIMIT_MAX`, default **300** / 15 min en prod.; en local el default de `.env.example` puede ser mayor).

Colección **Postman**: `docs/nomina-api.postman_collection.json` — variable `baseUrl` = tu API; añade un request `POST /auth/login`, guarda el token y usa **Bearer** en el resto (la colección puede requerir completar auth manualmente).

---

## 21. Funcionalidades del proyecto en producción

Todas las capacidades de Unidad 3 deben probarse contra **Render** (API + frontend; no solo local).

| Módulo | En producción | Notas de despliegue |
|--------|---------------|---------------------|
| **Login / JWT** | Render (API + web) | `AUTH_SECRET` en **nomina-api** |
| **Empleados** | API **nomina-api**; UI **nomina-web** | Filtros, alta/edición |
| **Export CSV** | **Solo navegador** | No requiere env extra; generado en cliente |
| **Export Excel `.xlsx`** | **Solo navegador** (ExcelJS) | Idem |
| **Procesar pago / simulación** | API Render | |
| **Boletas + PDF** | PDF en **cliente** (`boletasPdf.ts`) | |
| **Dashboard** | API Render | Gráficos con datos existentes |
| **Configuración** | API Render; solo gestores | Logo en base64; límite **1 MB** cuerpo JSON |
| **Usuarios + foto** | API Render | Recortar imagen en cliente (~400 KB recomendado) |
| **Tema claro/oscuro** | Solo frontend (CSS/React) | |
| **Asistente FAB** | API Render + `AI_*` | Ver sección 18 |
| **Panel inicio / marca** | **nomina-web** (`public/`) | |

### 21.1 Checklist extendido (incluye IA)

Además de la tabla en [14.1](#141-checklist-unidad-3-final-cierre-de-producto), verifica:

- [ ] Export CSV desde empleados (descarga con BOM UTF-8)
- [ ] Export Excel con filtros de tabla
- [ ] PDF o impresión de al menos una boleta
- [ ] Dashboard con al menos un pago emitido
- [ ] Usuario **gestor** accede a configuración; usuario **operativo** no
- [ ] Alta de usuario con foto; `PATCH /auth/me` con foto propia
- [ ] Asistente: tres preguntas distintas con respuestas coherentes
- [ ] Tras cambiar RMV o tasas AFP en configuración, el asistente refleja el cambio en una pregunta nueva

---

## 22. Seguridad y buenas prácticas

| Tema | Recomendación |
|------|----------------|
| `AUTH_SECRET` | Generar aleatorio ≥ 16 caracteres; **distinto** al de `backend/.env.example` |
| Contraseña admin inicial | Cambiar en el primer login en producción |
| `AI_API_KEY` | Solo en Render; rotar si se filtra |
| `.env` | Nunca en Git (ya en `.gitignore`) |
| `CORS_ORIGINS` | Lista mínima de orígenes reales; evita `*` |
| HTTPS | Siempre `https://` en `NEXT_PUBLIC_API_URL` y CORS |
| SQLite en Render Free | No usar para datos sensibles reales; es efímero |
| JWT en `sessionStorage` | Se pierde al cerrar pestaña; coherente con demo de curso |

Helmet está activo en la API (`backend/src/app.ts`). El frontend sirve fuentes desde `@fontsource` en el bundle; no hace falta whitelist de CDN extra en Render.

---

## Resumen rápido (checklist)

- [ ] Código en GitHub (`main`), sin `.env` ni `*.db` (véase [`.gitignore`](../.gitignore))
- [ ] API en Render (`backend/` Web Service, Free) con `AUTH_SECRET`, `NODE_ENV=production`, `CORS_ORIGINS`
- [ ] Health check `/api/v1/health`; login devuelve token; contraseña inicial cambiada
- [ ] Frontend en Render — **nomina-web** (`frontend/`, Start `npm run start:render`, `NEXT_PUBLIC_API_URL` con `/api/v1`, Node 22.x)
- [ ] `CORS_ORIGINS` incluye la URL exacta del front (`https://….onrender.com`) y `http://localhost:3001`
- [ ] Datos de demo: UI, y/o `npm run seed` en Render Shell (sección 11)
- [ ] **`AI_API_KEY`** (y opcionalmente `AI_BASE_URL`, `AI_MODEL`) en **nomina-api**; asistente probado en el frontend (sección 18)
- [ ] Checklist funcional completo (secciones [14.1](#141-checklist-unidad-3-final-cierre-de-producto) y [21.1](#211-checklist-extendido-incluye-ia))
- [ ] Postman o PowerShell probados con `baseUrl` de producción (sección 20)

**Autor del proyecto:** Jesús Pantoja — curso JavaScript Avanzado (UTP).

Render soporta **Blueprints** (`render.yaml` en la raíz del repo). Puedes desplegar de dos formas:

1. **Blueprint:** Dashboard → **Blueprints** → **New Blueprint** → selecciona este repositorio. Se crean **nomina-api** y **nomina-web**; luego completa `NEXT_PUBLIC_API_URL`, `CORS_ORIGINS` y opcionalmente `AI_API_KEY` como indica el comentario al inicio de `render.yaml`.
2. **Manual (dashboard):** secciones [8](#8-desplegar-la-api-en-render) y [12](#12-desplegar-el-frontend-en-render) — mismos comandos que el Blueprint.

Ambas opciones cubren **todo el producto en Render**, incluido el asistente IA.
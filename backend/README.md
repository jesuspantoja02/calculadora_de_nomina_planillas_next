# Backend — API REST (Express)

Única API del monorepo: Express 5 + TypeScript + SQLite, arquitectura hexagonal por módulos.

```
backend/
├── src/main.ts · app.ts · container.ts
├── src/modules/     # auth, empleados, planilla, configuracion, dashboard, asistente
├── src/shared/      # config, HTTP, SQLite, seguridad
├── scripts/seed.ts
├── tests/
└── .env.example
```

## Ejecutar

```bash
cp .env.example .env    # Windows: copy .env.example .env
npm install
npm run seed            # opcional
npm run dev             # http://localhost:3000/api/v1/health
```

Desde la raíz: `npm run dev:backend`.

## Auth (Unidad 3)

| Ruta | Auth |
|---|---|
| `GET /health`, `POST /auth/login` | Público |
| Resto de `/api/v1/*` | `Authorization: Bearer <token>` |

Admin inicial: `src/modules/auth/infrastructure/seed-usuarios.ts`.

## Asistente (Unidad 3 final)

`POST /api/v1/asistente/chat` — requiere `AI_API_KEY` (y opcionalmente `AI_BASE_URL`, `AI_MODEL`).

## Pruebas

```bash
npm test
npm run typecheck
```

Documentación completa: [README raíz](../README.md).

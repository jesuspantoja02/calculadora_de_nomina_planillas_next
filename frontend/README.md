# Frontend — Next.js (Unidad 3 final)

Cliente del monorepo actual: **Next.js 16** (Pages Router) + React 19 + Bootstrap 5.3.

La **Unidad 3** del curso (React + Vite, semanas 11–14) ya fue entregada; este árbol es la **Unidad 3 final**
(semanas 16–17 / cierre). Documentación completa: [README raíz](../README.md).

En desarrollo, `next.config.ts` reescribe `/api/*` → `http://localhost:3000`.

```
frontend/
├── src/pages/           # Rutas (login, empleados, planilla, …)
├── src/core/            # Auth JWT, layout, tema, asistente, toasts
├── src/modules/         # Features por dominio
├── src/shared/export/   # CSV UTF-8, Excel .xlsx (tablas), PDF
└── next.config.ts
```

## Ejecutar

Con el backend en `:3000`:

```bash
# Desde la raíz del monorepo
npm run dev:frontend    # http://localhost:3001
```

```bash
# O desde frontend/
npm install
cp .env.example .env    # Windows: copy .env.example .env
npm run dev
```

## Exportaciones (Unidad 3 final)

| Botón | Formato | Notas |
|---|---|---|
| CSV | UTF-8 + BOM + `sep=,` | Excel en español abre columnas bien |
| Excel | `.xlsx` (ExcelJS) | Tabla nativa, encabezados de color, filtros |
| PDF | Boletas | Listado o boleta seleccionada |

## Entorno

`NEXT_PUBLIC_API_URL=/api/v1` en local. En producción: URL absoluta del API Express.

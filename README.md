# Qualittyx

Qualittyx es una aplicación web para planificar auditorías, asignar controles,
registrar evaluaciones y analizar resultados por ciclo, unidad de negocio,
vertical y responsable.

## Tecnologías

- Next.js 16 y React 19.
- TypeScript 5.
- Tailwind CSS 4 y componentes Radix UI.
- Supabase Auth, PostgreSQL, Storage y Row Level Security.
- SWR para caché y sincronización de datos en el cliente.
- Vitest, pgTAP y Playwright para pruebas.
- Docker para compilación y ejecución reproducibles.

## Inicio rápido

Requisitos:

- Node.js 22, según `.nvmrc`.
- npm 11.
- Docker Desktop con el motor iniciado.

Instalación:

```bash
npm ci
copy .env.example .env.local
npm run verify:env
npm run db:start
npm run db:reset
npm run dev
```

La aplicación queda disponible en `http://localhost:3000` y Supabase Studio en
`http://127.0.0.1:54323`.

Para detener Supabase local:

```bash
npm run db:stop
```

## Variables de entorno

| Variable | Exposición | Uso |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y servidor | Clave pública limitada por RLS. |
| `SUPABASE_SECRET_KEY` | Solo servidor | Clave moderna recomendada para operaciones administrativas y readiness. |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor | Alternativa JWT heredada para operaciones administrativas. |
| `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP` | Cliente | Habilita el registro público únicamente cuando vale `true`. |

Nunca se debe exponer una clave `service_role` mediante una variable
`NEXT_PUBLIC_*`.

El servidor acepta, en orden de prioridad, `SUPABASE_AUTH_ADMIN_KEY`,
`SUPABASE_SERVICE_ROLE_JWT`, `SUPABASE_SERVICE_ROLE_KEY` o
`SUPABASE_SECRET_KEY`. Todas las claves y URLs deben pertenecer al mismo
proyecto Supabase.

## Comandos principales

| Comando | Propósito |
|---|---|
| `npm run dev` | Inicia Next.js en desarrollo. |
| `npm run check` | Ejecuta ESLint, TypeScript y pruebas unitarias. |
| `npm run check:architecture` | Verifica límites y dependencias arquitectónicas. |
| `npm run build` | Genera la compilación de producción. |
| `npm run test:e2e` | Ejecuta pruebas E2E con Playwright. |
| `npm run db:reset` | Reconstruye la base local desde las migraciones y el seed. |
| `npm run db:lint` | Analiza el esquema PostgreSQL local. |
| `npm run test:db` | Ejecuta las pruebas pgTAP. |
| `npm run bootstrap:admin` | Crea o actualiza el administrador inicial. |
| `npm run smoke` | Comprueba el endpoint público de salud. |

## Estructura

```text
app/                    Rutas, layouts y endpoints de Next.js
components/             Interfaz y controladores de pantalla
features/               Dominio y aplicación organizados por funcionalidad
hooks/                  Caché y consultas reutilizables del cliente
lib/domain/             Permisos y reglas transversales puras
lib/repositories/       Frontera de persistencia con Supabase
scripts/                Validaciones y tareas operativas
supabase/migrations/    Evolución versionada del esquema
supabase/tests/         Pruebas de esquema, funciones y RLS
tests/e2e/              Pruebas de navegación pública y protegida
docs/                   Documentación técnica y operativa
```

## Documentación

- [Visión funcional](docs/FUNCTIONAL_OVERVIEW.md)
- [Arquitectura](docs/ARCHITECTURE.md)
- [Guía de desarrollo](docs/DEVELOPMENT.md)
- [Base de datos](docs/DATABASE.md)
- [Seguridad](docs/SECURITY.md)
- [Pruebas](docs/TESTING.md)
- [Despliegue y operación](docs/OPERATIONS.md)

## Criterio de mantenimiento

Las reglas de negocio deben vivir en módulos de dominio puros; los componentes
no deben consultar Supabase directamente. Cada cambio de esquema posterior a la
línea base debe agregarse como una nueva migración, nunca modificando una
migración aplicada.

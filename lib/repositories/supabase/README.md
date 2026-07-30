# Repositorios Supabase

Esta carpeta es la frontera de persistencia consumida por la aplicación.

| Módulo | Responsabilidad |
|---|---|
| `access.ts` | Perfil activo y guardas de autorización. |
| `account.ts` | Contraseña de la cuenta autenticada. |
| `app-data.ts` | Contrato público de carga por dominios. |
| `app-data-query.ts` | Consultas, paginación, adaptación y alcance por rol. |
| `app-data-db-types.ts` | Formas internas de las filas SQL. |
| `users.ts` | Perfiles, altas y contraseñas administradas. |
| `business-units.ts` | Unidades de negocio. |
| `cycles.ts` | Ciclos configurables. |
| `settings.ts` y `thresholds.ts` | Umbrales semánticos. |
| `catalog.ts` | Productos, procesos, otros y áreas transversales. |
| `models.ts` | Modelos, verticales y parámetros. |
| `planning.ts` | Lotes, auditores y controles. |
| `evaluations.ts` | Respuestas, borradores y finalización. |
| `evidences.ts` | Archivos y evidencias. |
| `dashboard.ts` | Agregados del dashboard ejecutivo. |
| `notifications.ts` | Notificaciones. |
| `search.ts` | Índice de búsqueda. |

## Reglas

- Los componentes y hooks no acceden directamente a Supabase.
- Cada repositorio expone contratos del dominio, no filas SQL crudas.
- Las operaciones críticas invocan RPC transaccionales.
- RLS siempre permanece como autoridad final.
- Los fallos se propagan para que la interfaz muestre un estado recuperable.
- Una consulta extensa debe paginar o delegar agregaciones a PostgreSQL.

Al agregar una operación:

1. definir su contrato en el dominio correspondiente;
2. aplicar la guarda de autorización necesaria;
3. implementar la lectura, escritura o RPC;
4. adaptar nombres, nulos y enums;
5. agregar pruebas unitarias o de base de datos;
6. actualizar la documentación del dominio.

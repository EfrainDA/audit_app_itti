# Operación y alertas

## Salud

- `GET /api/health`: comprueba configuración pública sin consultar la base.
- `GET /api/health/ready`: comprueba la clave administrativa y conectividad con
  PostgreSQL, con un timeout de tres segundos.

Ambos endpoints responden con `Cache-Control: no-store` y `X-Request-Id`.

## Logs estructurados

Los eventos del servidor se escriben como JSON y pueden filtrarse en Vercel por
el campo `event`. Los eventos operativos principales son:

| Evento | Nivel | Significado |
|---|---|---|
| `profile_lookup_failed` | error | Falló la carga del perfil autenticado. |
| `supabase_profile_latency_high` | warning | Supabase superó el umbral configurado. |
| `readiness_check_failed` | error | La instancia no puede operar contra PostgreSQL. |
| `admin_password_changed` | info | Un administrador cambió una contraseña. |
| `admin_password_change_failed` | error | Falló un cambio administrativo de contraseña. |
| `operational_alert_delivery_failed` | error | El receptor de alertas no respondió. |

## Webhook de alertas

Configurar en Vercel:

```text
OPERATIONS_ALERT_WEBHOOK_URL=https://receptor.example/alerts
OPERATIONS_ALERT_WEBHOOK_TOKEN=
SUPABASE_LATENCY_ALERT_MS=1500
```

El token es opcional. El webhook recibe JSON y dispone de dos segundos para
responder. Puede conectarse a Slack, Teams, Make, Zapier, PagerDuty u otro
receptor. Nunca deben incluirse tokens de sesión, contraseñas o claves Supabase
en el contexto de una alerta.

Alertas recomendadas en el receptor:

- inmediata: `readiness_check_failed`;
- inmediata: `profile_lookup_failed`;
- inmediata: `admin_password_change_failed`;
- auditoría: `admin_password_changed`;
- advertencia: `supabase_profile_latency_high`;
- agregada desde Vercel: cinco o más respuestas HTTP 500 en cinco minutos.

## Procedimiento de incidente

1. Copiar el `X-Request-Id` de la respuesta afectada.
2. Buscar ese identificador en Vercel Logs.
3. Comprobar `/api/health/ready`.
4. Verificar que URLs y claves Supabase correspondan al mismo proyecto.
5. Si hubo cambios de variables, generar un nuevo deployment.
6. Registrar causa, impacto y corrección antes de cerrar el incidente.


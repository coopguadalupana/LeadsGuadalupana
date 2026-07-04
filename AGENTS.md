# leadsGuadalupana — AGENTS.md

## Project

WhatsApp/Meta Inbox multi-tenant que ingiere mensajes de WhatsApp (Cloud API), los atribuye al anuncio que los generó y enruta leads mediante flujos de auto-respuesta configurables por agencia financiera antes de escalar a un agente humano.

## Stack

| Capa     | Tecnología                                                  |
| -------- | ----------------------------------------------------------- |
| Frontend | Next.js 16.2.10, React 19.2.4, Tailwind CSS v4              |
| Backend  | Next.js API Routes (App Router), TypeScript strict          |
| Base     | SQL Server (BankworksPhoenix) vía `mssql` con pool          |
| Auth     | NextAuth v4 + LDAP (`ldapjs`)                               |
| Prod     | PM2 (`ecosystem.config.js`) + Nginx reverse proxy           |

## Rutas del frontend

- `/login` — Autenticación LDAP
- `/app/inbox` — Bandeja de conversaciones por agencia
- `/app/leads` — Leads generados
- `/app/ads` — Rendimiento de anuncios
- `/app/flows` — Flujos de auto-respuesta
- `/app/config` — Configuración de la agencia

## API REST

Todas bajo `/leads/api/` (basePath de Next.js):

| Método | Endpoint                          | Descripción                        |
| ------ | --------------------------------- | ---------------------------------- |
| GET    | `/api/health`                     | Health check                       |
| GET    | `/api/leads`                      | Listar leads (filtro agencia)      |
| GET    | `/api/leads/[id]`                 | Detalle de lead                    |
| GET    | `/api/conversations`              | Listar conversaciones              |
| GET    | `/api/conversations/[id]`         | Detalle + mensajes                 |
| PATCH  | `/api/conversations/[id]`         | Actualizar estado/asignación       |
| POST   | `/api/conversations/[id]/send`    | Enviar mensaje (texto, imagen, video) |
| POST   | `/api/conversations/[id]/read`   | Marcar conversación como leída + read receipt WhatsApp |
| GET    | `/api/ads`                        | Anuncios con métricas              |
| GET    | `/api/media/[id]`                  | Proxy de multimedia WhatsApp (imagen, video, audio, doc) |
| GET    | `/api/agency`                     | Config de la agencia actual        |
| POST   | `/api/flows`                      | Crear flow                         |
| GET    | `/api/flows`                      | Listar flows                       |
| PATCH  | `/api/flows/[id]`                 | Actualizar flow                    |
| DELETE | `/api/flows/[id]`                 | Eliminar flow                      |
| GET    | `/api/auth/providers`             | Login SSO (NextAuth)               |

## Webhook WhatsApp

- GET `/api/webhooks/whatsapp` — Verificación (hub.mode/hub.verify_token/hub.challenge)
- POST `/api/webhooks/whatsapp` — Recepción de mensajes y status updates
- Validación HMAC con `META_APP_SECRET` cuando está configurado
- Idempotencia vía `message_id` + `conversacion_id`
- Atribución mediante `ad_id` → `getAdAttribution()` → campaña/agencia
- Captura `image_id`, `video_id`, `audio_id`, `document_id` para proxy multimedia

## Base de datos (SQL Server)

Tablas con prefijo `lg_`:

- `lg_agencias` — Agencias financieras multi-tenant
- `lg_usuarios` — Usuarios mapeados vía LDAP (admin/agent/supervisor)
- `lg_conversaciones` — Hilos por contacto externo (wa_id), con estado y ad_id
- `lg_mensajes` — Mensajes individuales con tipo, contenido JSON y metadata
- `lg_leads` — Leads generados a partir de conversaciones
- `lg_flows` — Flujos de auto-respuesta configurables (JSON triggers + pasos)
- `lg_ads_cache` — Caché de atribución de anuncios vía Meta Graph API

Estados de conversación: `en_espera` → `auto_respondiendo` → `en_curso` → `cerrada`

## Despliegue

### Nginx (reverse proxy)

```nginx
# leadsGuadalupana (WhatsApp Inbox Multi-tenant)
location /leads/ {
    proxy_pass http://localhost:3007;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 60s;
}

# Segundo tenant / agencia (puerto 3008)
location /agencia/ {
    proxy_pass http://localhost:3008;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    proxy_read_timeout 60s;
}
```

### PM2

```bash
pm2 start ecosystem.config.js
```

### Variables de entorno requeridas

| Variable                     | Descripción                             |
| ---------------------------- | --------------------------------------- |
| `SQL_SERVER`                 | Host SQL Server                         |
| `SQL_USER`                   | Usuario SQL                             |
| `SQL_PASSWORD`               | Contraseña SQL                          |
| `SQL_DB`                     | Base de datos                           |
| `PORTSQL`                    | Puerto SQL (default 1433)               |
| `NEXTAUTH_URL`               | URL base para NextAuth                  |
| `NEXTAUTH_SECRET`            | Secreto JWT                             |
| `LDAP_URL`                   | URL del servidor LDAP                   |
| `META_WEBHOOK_VERIFY_TOKEN`  | Token de verificación webhook WhatsApp  |
| `META_APP_SECRET`            | App Secret para HMAC (opcional)         |
| `WHATSAPP_TOKEN`             | Token de acceso Meta Graph API (usado en código) |
| `WHATSAPP_PHONE_ID`          | ID del número de teléfono de WhatsApp   |
| `WHATSAPP_API_VERSION`       | Versión de la API (default: v25.0)      |
| `META_ACCESS_TOKEN`          | Alias de WHATSAPP_TOKEN (documentación) |
| `META_PHONE_NUMBER_ID`       | Alias de WHATSAPP_PHONE_ID (documentación) |
| `META_BUSINESS_ACCOUNT_ID`   | ID del Business Account de Meta         |
| `NEXT_BASE_PATH`            | basePath de Next.js (default: `/leads`)  |

## Developer commands

```bash
npm install        # Instalar dependencias
npm run dev        # Dev server :3007
npm run build      # Build producción
npm start          # Start producción
npm test           # Correr tests
npm run lint       # ESLint
npm run typecheck  # TypeScript estricto
```

## Estado del frontend

| Página     | Componente | Fuente datos | Refresh | Acciones |
| ---------- | ---------- | ------------ | ------- | -------- |
| `/app/inbox` | Client     | API `/api/conversations` | Polling 10s | Filtros, badge no leídos, preview mensaje |
| `/app/inbox/[id]` | Client | API `/api/conversations/[id]` | Polling 5s | Enviar texto, imagen/video, ver multimedia, scroll automático |
| `/app/leads` | Client | API `/api/leads` | Polling 10s | Cambiar calificación inline |
| `/app/flows` | Client | API `/api/flows` | Manual | Crear/editar/eliminar/toggle |
| `/app/flows/[id]` | Client | API `/api/flows` | Manual | Editor visual drag & drop (React Flow) |
| `/app/ads` | Client | API `/api/ads/performance` | Manual | Filtros |
| `/app/config` | Client | API `/api/agency/config` | Manual | Guardar JSON (solo admin) |

## Roles y permisos

| Rol | Acceso |
|-----|--------|
| `agent` | Solo ver conversaciones/leads de su agencia, enviar mensajes |
| `supervisor` | Ver todas las agencias, transferir conversaciones, cambiar agencia |
| `flow_admin` | Lo mismo que agent + crear/editar/eliminar flujos |
| `admin` | Asignar roles a usuarios, gestionar config |
| `superadmin` | Acceso total a todo |

Validación via `src/lib/auth/permissions.ts` — funciones `canViewAllConversations()`, `canManageFlows()`, `canAssignRoles()`, etc.

## Conventions

- TypeScript strict mode.
- **Pre-commit**: `npm run lint && npm run typecheck`
- Per-agency isolation via `agencia_id` en cada query.
- Webhook handlers idempotentes (Meta puede duplicar mensajes).
- Almacenar `ad_id`, `campaign_id`, `agencia_id` en cada mensaje entrante.
- Auto-response flows en JSON por agencia (no hardcodeados).
- Commits en español.
- **Solicitar confirmación** antes de ejecutar UPDATE o DELETE en base de datos. Mostrar el query SQL exacto y esperar aprobación.

## Brand / UI Colors

Basado en `cooperativaguadalupana.com.gt`:

| Color     | Hex       | Uso                          |
| --------- | --------- | ---------------------------- |
| Rojo      | `#cf2e2e` | Botones, badges, active nav  |
| Azul osc. | `#003160` | Sidebar, headers, tabla      |
| Azul      | `#0e5bb0` | Links, bot messages          |
| Verde     | `#27a536` | Estado auto_respondiendo     |
| Texto     | `#464646` | Texto principal              |
| Gris      | `#6b7280` | Texto secundario             |
| Fondo     | `#f5f5f5` | Background principal         |

## Cliente API

`src/lib/client-api.ts` — Helper que detecta el basePath (`/leads` o `/agencia`) desde `window.location.pathname` y construye las URLs correctas. Usar `apiGet()`, `apiPost()`, `apiPatch()`, `apiPut()`, `apiDelete()` en lugar de `fetch()` directo.

## Config de Next.js

- `next.config.ts`: `basePath` dinámico via `NEXT_BASE_PATH`, `serverExternalPackages: ["ldapjs"]` para evitar que el bundler rompa ldapjs.

## Setup notes

- WhatsApp Cloud API requiere Business Account verificado, webhook URL pública (HTTPS) y token permanente.
- Meta Graph API tokens necesitan permisos `ads_management` y `pages_manage_metadata`.
- Usar ngrok/Cloudflare Tunnel para pruebas locales de webhook.
- Nginx maneja el reverse proxy con basePath `/leads/` → `localhost:3007`.
- Para múltiples agencias/tenants, duplicar instancia en otro puerto con su propio `.env`.

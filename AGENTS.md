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
| POST   | `/api/conversations/[id]/send`    | Enviar mensaje (template o texto)  |
| GET    | `/api/ads`                        | Anuncios con métricas              |
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

## Base de datos (SQL Server)

Tablas con prefijo `lg_`:

- `lg_agencias` — Agencias financieras multi-tenant
- `lg_usuarios` — Usuarios mapeados vía LDAP (admin/agent/supervisor)
- `lg_conversaciones` — Hilos por contacto externo (wa_id), con estado y ad_id
- `lg_mensajes` — Mensajes individuales con tipo, contenido JSON y metadata
- `lg_leads` — Leads generados a partir de conversaciones
- `lg_flows` — Flujos de auto-respuesta configurables (JSON triggers + pasos)
- `lg_ads_cache` — Caché de atribución de anuncios vía Meta Graph API

Estados de conversación: `auto_respondiendo` → `en_espera` → `en_curso` → `cerrada`

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
| `META_ACCESS_TOKEN`          | Token de acceso Meta Graph API          |
| `META_PHONE_NUMBER_ID`       | ID del número de teléfono de WhatsApp   |
| `META_BUSINESS_ACCOUNT_ID`   | ID del Business Account de Meta         |

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

## Conventions

- TypeScript strict mode.
- **Pre-commit**: `npm run lint && npm run typecheck`
- Per-agency isolation via `agencia_id` en cada query.
- Webhook handlers idempotentes (Meta puede duplicar mensajes).
- Almacenar `ad_id`, `campaign_id`, `agencia_id` en cada mensaje entrante.
- Auto-response flows en JSON por agencia (no hardcodeados).
- Commits en español.

## Setup notes

- WhatsApp Cloud API requiere Business Account verificado, webhook URL pública (HTTPS) y token permanente.
- Meta Graph API tokens necesitan permisos `ads_management` y `pages_manage_metadata`.
- Usar ngrok/Cloudflare Tunnel para pruebas locales de webhook.
- Nginx maneja el reverse proxy con basePath `/leads/` → `localhost:3007`.
- Para múltiples agencias/tenants, duplicar instancia en otro puerto con su propio `.env`.

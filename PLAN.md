# Plan de Implementación — leadsGuadalupana

> **Última actualización:** 2026-07-04
> **Estado general:** 🟢 En produccion — 4 conversaciones reales, login funcional, UI con brand cooperativa

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend + Frontend | Next.js 14+ (App Router) + TypeScript strict |
| Base de datos | SQL Server (BankworksPhoenix) — misma BD, tablas nuevas |
| Acceso a datos | `mssql` pool, queries directas (sin ORM) |
| Autenticación | NextAuth.js + LDAP (`172.20.1.69`, `DC=guadalupana,DC=com,DC=gt`) |
| Estilos | Tailwind CSS |
| Despliegue | Servidor local, Nginx reverse proxy + PM2 (`servicios.guadalupana.com.gt`) |
| Alcance inicial | Solo WhatsApp Cloud API (IG y FB después) |

---

## Fases

### ✅ Requisitos cumplidos
- [x] Fase 0 — Proyecto inicial (scaffolding, config, pool DB)
- [x] Fase 1 — Base de datos (tablas SQL Server)
- [x] Fase 2 — Autenticación (NextAuth + LDAP)
- [x] Fase 3 — Webhook WhatsApp (recibir + enviar)
- [x] Fase 4 — Ad Attribution (Meta Graph API)
- [x] Fase 5 — Flow Engine (auto-respuesta)
- [x] Fase 6 — API REST
- [x] Fase 7 — Frontend (UI completa + mejoras)
- [x] Fase 7a — Roles y permisos (agent/supervisor/admin/flow_admin/superadmin)
- [x] Fase 7b — Media proxy (imagenes, video, audio, documentos)
- [x] Fase 7c — Read receipts (marcar como leido + notificar WhatsApp)
- [x] Fase 7d — Transferencia de conversaciones entre agentes
- [x] Fase 7e — Brand UI (colores cooperativa: rojo #cf2e2e, azul #003160)
- [ ] Fase 8 — Instagram & Facebook Messenger
- [x] Fase 9 — Despliegue (Nginx + PM2 + basePath)
- [ ] Fase 10 — Testing

---

## Fase 0 — Proyecto inicial

**Objetivo:** Inicializar el proyecto con todas las herramientas/config.

| # | Tarea | Estado | Notas |
|---|-------|--------|-------|
| 0.1 | `npx create-next-app@latest` con App Router, TypeScript, Tailwind, src/ | ✅ | |
| 0.2 | `tsconfig.json` strict mode (`strict: true`, `noUncheckedIndexedAccess`) | ✅ | |
| 0.3 | Pool SQL Server (`src/lib/db.ts`) — `mssql` singleton | ✅ | Env: `SQL_SERVER`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB` |
| 0.4 | Variables de entorno (`.env.local`) | ✅ | |
| 0.5 | Scripts npm: `dev`, `build`, `start`, `lint`, `typecheck` | ✅ | |

**Variables de entorno (.env.local):**

```env
# SQL Server (BankworksPhoenix)
SQL_SERVER=
SQL_USER=
SQL_PASS=
SQL_DB=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# LDAP
LDAP_URL=ldap://172.20.1.69
LDAP_BASE_DN=OU=Gerencia Negocios,DC=guadalupana,DC=com,DC=gt
LDAP_SERVICE_USER=
LDAP_SERVICE_PASS=

# WhatsApp Cloud API
WHATSAPP_TOKEN=EAAOH74Wya4U...
WHATSAPP_PHONE_ID=1229011763623146
WHATSAPP_API_VERSION=v25.0

# Meta Webhook
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
```

---

## Fase 1 — Base de datos

**Objetivo:** Crear tablas en SQL Server (BankworksPhoenix).

| Tabla | Columnas clave | Estado |
|-------|---------------|--------|
| `lg_agencias` | `id INT PK IDENTITY`, `nombre`, `subou_ldap`, `config` (NVARCHAR/JSON), `activa` | ✅ |
| `lg_usuarios` | `id`, `ldap_sam`, `nombre`, `email`, `agencia_id FK`, `rol` | ✅ |
| `lg_conversaciones` | `id`, `agencia_id FK`, `plataforma`, `contacto_externo_id`, `ad_id`, `campaign_id`, `estado`, `flow_state` (JSON), `creado`, `actualizado` | ✅ |
| `lg_mensajes` | `id`, `conversacion_id FK`, `message_id` (UNIQUE por conv), `role`, `tipo`, `contenido` (JSON), `metadata` (JSON), `recibido`, `procesado` | ✅ |
| `lg_leads` | `id`, `conversacion_id FK`, `agencia_id FK`, `nombre`, `telefono`, `email`, `calificacion`, `notas`, `asignado_a FK` | ✅ |
| `lg_flows` | `id`, `agencia_id FK`, `nombre`, `activo`, `trigger` (JSON), `pasos` (JSON), `version` | ✅ |
| `lg_ads_cache` | `ad_id PK`, `campaign_id`, `campaign_name`, `agency_id`, `ultima_actualizacion` | ✅ |

**Script DDL:** `database/schema.sql`

---

## Fase 2 — Autenticación (NextAuth + LDAP)

**Objetivo:** Login contra LDAP corporativo, sesión multi-tenant.

| # | Archivo | Propósito | Estado |
|---|---------|-----------|--------|
| 2.1 | `src/app/api/auth/[...nextauth]/route.ts` | Route handler de NextAuth | ✅ |
| 2.2 | `src/lib/auth/ldap-provider.ts` | Provider LDAP custom (bind, search, parse OU) | ✅ |
| 2.3 | `src/lib/auth/auth-options.ts` | Config NextAuth (callbacks JWT/session) | ✅ |
| 2.4 | `src/middleware.ts` | Proteger `/app/*`, redirect a login | ✅ |

**Flujo LDAP:**
1. Bind servicio → buscar `sAMAccountName` en `OU=Gerencia Negocios,DC=guadalupana,DC=com,DC=gt`
2. Verificar password con bind del usuario
3. Parsear `OU=Agencia X` del DN
4. Buscar/crear en `lg_usuarios`, obtener `agencia_id` y `rol`
5. JWT token incluye `agencia_id`, `rol`, `subou_ldap`

---

## Fase 3 — Webhook WhatsApp

**Objetivo:** Recibir mensajes entrantes y enviar respuestas.

| # | Archivo | Propósito | Estado |
|---|---------|-----------|--------|
| 3.1 | `src/app/api/webhooks/whatsapp/route.ts` | GET verify + POST receive | ✅ |
| 3.2 | `src/lib/whatsapp/verify.ts` | Validar `hub.verify_token` | ✅ |
| 3.3 | `src/lib/whatsapp/receive.ts` | Parsear payload, validar firma, extraer datos | ✅ |
| 3.4 | `src/lib/whatsapp/send.ts` | Enviar mensajes via API | ✅ |
| 3.5 | `src/lib/webhook/idempotency.ts` | Detección de duplicados por `message_id` | ✅ |

**Endpoint:** `POST/GET https://servicios.guadalupana.com.gt/api/webhooks/whatsapp`

---

## Fase 4 — Ad Attribution

**Objetivo:** Identificar anuncio/campaña/agencia que generó cada lead.

| # | Archivo | Propósito | Estado |
|---|---------|-----------|--------|
| 4.1 | `src/lib/meta-ads/attribution.ts` | `getAdAttribution(ad_id)` con cache | ✅ |
| 4.2 | `src/lib/meta-ads/graph-api.ts` | Llamadas a Graph API | ✅ |
| 4.3 | Integración en webhook | Guardar `ad_id`, `campaign_id` en mensaje | ✅ |

---

## Fase 5 — Flow Engine (Auto-respuesta)

**Objetivo:** Motor de flujos configurables por agencia.

| # | Archivo | Propósito | Estado |
|---|---------|-----------|--------|
| 5.1 | `src/lib/flows/types.ts` | Tipos: `Flow`, `FlowStep`, `FlowTrigger`, `StepAction` | ✅ |
| 5.2 | `src/lib/flows/engine.ts` | `processMessage(conversacion, mensaje)` | ✅ |
| 5.3 | `src/lib/flows/actions.ts` | Acciones: sendText, askQuestion, saveLead, escalate, etc. | ✅ (integrado en engine) |
| 5.4 | `src/lib/flows/integration.ts` | Hook webhook → flow engine | ✅ |

**Acciones del flow:**
- `send_text` — enviar mensaje
- `ask_question` — enviar + esperar respuesta (guardar campo)
- `save_lead_field` — extraer dato de respuesta y guardar en lead
- `qualify_lead` — hot/warm/cold según criterios
- `escalate_to_human` — cambiar estado a `en_espera`
- `end_flow` — cerrar auto-response

---

## Fase 6 — API REST

**Mejoras implementadas:**
- Roles y permisos en cada endpoint (`canViewAllConversations`, `canManageFlows`, etc.)
- Supervisores pueden ver todas las agencias via `?agencia_id=` filter
- `PATCH /api/conversations/[id]` permite cambiar `agencia_id`, `estado`, `asignado_a`
- `POST /api/conversations/[id]/read` — read receipt + tracking
- `GET /api/agency/agents` — listar agentes (scoped por rol)
- `GET /api/media/[id]` — proxy de multimedia WhatsApp

**Objetivo:** Endpoints para el frontend.

| Endpoint | Métodos | Propósito | Estado |
|----------|---------|-----------|--------|
| `/api/conversations` | GET | Inbox scoped por agencia | ✅ |
| `/api/conversations/[id]` | GET | Detalle + mensajes | ✅ |
| `/api/conversations/[id]/send` | POST | Enviar mensaje como agente | ✅ |
| `/api/conversations/[id]/assign` | PATCH | Asignar agente | ✅ |
| `/api/leads` | GET, POST | CRUD leads | ✅ |
| `/api/leads/[id]` | PATCH | Actualizar lead | ✅ |
| `/api/flows` | GET, POST | CRUD flows | ✅ |
| `/api/flows/[id]` | PUT, DELETE | Editar/eliminar flow | ✅ |
| `/api/ads/performance` | GET | Dashboard ads | ✅ |
| `/api/agency/config` | GET, PATCH | Config agencia | ✅ |
| `/api/health` | GET | Health check | ✅ |

---

## Fase 7 — Frontend

**Objetivo:** UI multi-tenant segmentada por agencia.

| Ruta | Página | Estado |
|------|--------|--------|
| `/app/inbox` | Lista de conversaciones con filtros | ✅ |
| `/app/inbox/[id]` | Chat individual con contacto | ✅ |
| `/app/leads` | Tabla de leads con calificación | ✅ |
| `/app/flows` | Lista de flows auto-respuesta | ✅ |
| `/app/flows/[id]` | Editor de flow (triggers + pasos) | ✅ |
| `/app/ads` | Dashboard rendimiento anuncios | ✅ |
| `/app/config` | Configuración de agencia | ✅ |

---

## Fase 8 — Instagram & Facebook Messenger

**Objetivo:** Ampliar a los otros canales de Meta.

| # | Tarea | Estado |
|---|-------|--------|
| 8.1 | Webhook Instagram (`/api/webhooks/instagram`) | ⬜ |
| 8.2 | Webhook Facebook Page (`/api/webhooks/facebook`) | ⬜ |
| 8.3 | Unificación en `lg_conversaciones` (campo `plataforma`) | ⬜ |
| 8.4 | Auto-response compartido (mismo engine) | ⬜ |

---

## Fase 9 — Despliegue

**Objetivo:** Poner en producción con Nginx + PM2.

| # | Tarea | Estado |
|---|-------|--------|
| 9.1 | `ecosystem.config.js` (PM2) — 2 instancias (3007/3008) | ✅ |
| 9.2 | Config Nginx reverse proxy — `/leads/` y `/agencia/` | ✅ |
| 9.3 | Health check endpoint — `/api/health` | ✅ |
| 9.4 | Logrotate para PM2 logs | ⬜ |
| 9.5 | Script de deploy (`deploy.sh`) | ⬜ |

---

## Fase 10 — Testing

**Objetivo:** Tests unitarios, integración y simulación.

| # | Tarea | Estado |
|---|-------|--------|
| 10.1 | Unit tests: flow engine, ad attribution, helpers | ⬜ |
| 10.2 | API integration: Supertest + DB mock | ⬜ |
| 10.3 | Webhook simulator (script node) | ⬜ |
| 10.4 | E2E: Playwright (login, inbox, send) | ⬜ |

---

## Convenciones del proyecto

- **Commits en español**
- **TypeScript strict mode**
- **Queries parametrizadas** (`@param` en `mssql`, nunca concatenación)
- **Aislamiento por agencia** vía `WHERE agencia_id = @aid` en cada query
- **Webhook handlers idempotentes** (check `message_id` duplicado)
- **`ad_id`, `campaign_id`, `agency_id`** guardados en cada mensaje entrante
- **Flows JSON-configurables** por agencia (no hardcoded)

---

## Estado de fases activa

> **Fase actual:** Fase 0-7 completadas (incluyendo subfases). En produccion con Nginx + PM2. Pendiente: Instagram/Facebook y testing formal.

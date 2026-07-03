# leadsGuadalupana — AGENTS.md

## Project

WhatsApp/Meta Inbox that ingests messages from Instagram, Facebook, and WhatsApp; attributes each message to the ad that generated it; and routes leads through configurable auto-response flows before escalating to a human agent. Frontend is segmented by financial agency.

## Architecture guidelines

- **Backend**: WhatsApp Cloud API (webhook receive + send). Meta Graph API for ad attribution (ad_id → campaign → agency mapping).
- **Frontend**: Multi-tenant UI segmented by agency. Each agency sees only its own leads, conversations, and ad performance.
- **Auto-response flows**: Configurable per-agency decision trees/filters (e.g., keywords, question templates) that qualify leads before human handoff.
- **Ad attribution**: Store `ad_id` from incoming message webhook, join with Meta Ads insights to identify campaign/agency.

## Stack expectations (to be confirmed)

- Node.js/TypeScript for backend (WhatsApp webhook server)
- React or similar SPA for frontend
- Database for conversations, leads, flows, agency config
- Deployed to cloud (Vercel, Railway, or similar)

## Developer commands (once project starts)

Install dependencies:
```bash
npm install
```

Run dev server:
```bash
npm run dev
```

Run tests:
```bash
npm test
```

Lint & typecheck before commit:
```bash
npm run lint && npm run typecheck
```

## Conventions

- Prefer TypeScript strict mode.
- Keep per-agency isolation at the DB query level (agency_id on every table).
- Webhook handlers must be idempotent (Meta may send duplicates).
- Store ad_id, campaign_id, and agency_id on every incoming message.
- Auto-response flows are JSON-configurable per agency (not hardcoded).
- Commit messages in Spanish (repo convention).

## Setup notes

- WhatsApp Cloud API requires a verified Business Account, a webhook URL (HTTPS + public), and a permanent token.
- Meta Graph API tokens need `ads_management` and `pages_manage_metadata` permissions.
- Use ngrok/Cloudflare Tunnel for local webhook testing.

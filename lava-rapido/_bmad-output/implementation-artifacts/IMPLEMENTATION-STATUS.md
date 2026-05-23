---
updated: 2026-05-21
status: mvp-ready-local
---

# Status de Implementação — MVP Local

## Concluído (E1–E4)

| Área | Status | Notas |
|------|--------|-------|
| Monorepo workspaces | ✅ | `apps/api`, `packages/shared`, `packages/api-client` |
| API Hono `/v1/*` | ✅ | branches, wash-types, customers, vehicle-entries, payments, cash-register, events |
| DEV_AUTH | ✅ | `dev-admin` / `dev-operator` — validação local sem Keycloak |
| Multi-tenant + branch | ✅ | `X-Branch-Id`, middleware chain |
| Web premium soft | ✅ | Board, + Lavagem, Caixa, Filiais, Tipos, Clientes, Ticket |
| Seed demo | ✅ | 2 filiais, tipos, clientes, entries sample |
| Teste isolamento | ✅ | `npm run test:api` (requer Postgres) |

## Pendente pós-MVP

- Keycloak realm produção (substituir DEV_AUTH)
- App mobile Expo
- WhatsApp Chatwoot real (stub/log no MVP)
- Stripe billing

## Como validar

Ver README.md raiz — seção **Validar o MVP**.

---
project_name: lava-rapido
user_name: Diego
date: '2026-05-21'
sections_completed: ['discovery', 'domain_overview', 'architecture']
status: complete
optimized_for_llm: true
---

# Project Context for AI Agents

_Regras críticas para implementação consistente no Lava Rápido — SaaS multi-tenant de gestão de lava-rápido automotivo._

---

## Visão do produto

- SaaS multi-tenant: **Tenant = conta do dono (1 assinatura)**; **Filial = ponto físico** (1 ou N por Tenant)
- Plataformas: **web** (Next.js) + **mobile nativo** (Expo/React Native)
- UX: poucos botões, touch targets ≥48px, linguagem simples, visual premium soft
- Offline-tolerante na operação (sync posterior)

## Technology Stack & Versions

| Camada | Stack | Notas |
|--------|-------|-------|
| **Frontend web** | Next.js 16.2.6, React 19, TypeScript 5 | `apps/web` — UI only, chama API + Keycloak OIDC |
| **API** | Hono + TypeScript (Node/Bun) | `apps/api` — REST `/v1/*`, container Docker |
| UI | shadcn/ui 4.x, Tailwind CSS 4 | Apenas no frontend web |
| **Banco** | PostgreSQL self-hosted | RLS + `tenant_id`; Drizzle ou Prisma na API |
| **Auth** | **Keycloak** self-hosted (OIDC/OAuth2) | **Não implementar auth custom** — configurar realm/clients |
| **Arquivos** | MinIO (S3-compatible) self-hosted | Fotos via presigned URL emitida pela API |
| Mobile | Expo — `apps/mobile/` | AppAuth OIDC + `packages/api-client` |
| Cache/filas | Redis (Swarm/K8s) | Filas, cache, rate limit, pub/sub Realtime |
| Vetorial (opcional) | Qdrant — Fase 2+ | Só se feature IA/busca semântica; **não substitui Postgres** |
| BMAD | `lava-rapido/_bmad/` | Artefatos em `lava-rapido/_bmad-output/` |

## Domínio — entidades principais

```
Tenant → Branch (1..N), WashType, Employee, Customer
Branch → VehicleEntry, Payment, Expense (operação/financeiro por filial)
Customer → name, phone, whatsapp_opt_in (compartilhado no Tenant)
VehicleEntry → plate, wash_type, customer, branch_id, status, photos[], payments[]
Status: preparation | washing | finishing | ready | canceled
Role: admin | manager | user (+ permission matrix configurável)
Pricing: assinatura mensal fixa por Tenant (modelo A); filiais incluídas
```

## Critical Implementation Rules

### Auth — Keycloak (não desenvolver auth próprio)

- **Keycloak** = IdP self-hosted (Docker Swarm/K8s); padrão OIDC/OAuth2
- Referência de segurança: Red Hat, CNCF, MFA/brute-force/session built-in, auditoria
- **Proibido** implementar login/senha/hash JWT manual na API
- Realm único `lava-rapido`; clients separados: `lava-rapido-web`, `lava-rapido-mobile`, `lava-rapido-api` (confidential)
- Claim custom **`tenant_id`** no JWT (User Attribute + Protocol Mapper Keycloak)
- Claims **`branch_ids[]`** e **`default_branch_id`** — filiais que o usuário pode acessar
- Header API **`X-Branch-Id`** — filial ativa na sessão (validar ∈ branch_ids; admin pode alternar)
- Roles Keycloak espelham RBAC: `admin`, `manager`, `user` (por tenant via groups ou orgs)
- **Web:** `@react-keycloak/web` ou Auth.js (`next-auth`) provider Keycloak
- **Mobile:** `react-native-app-auth` (OAuth2 PKCE — padrão AppAuth)
- **API Hono:** validar JWT via JWKS Keycloak (`jose` library) — middleware `auth`
- Refresh token rotation habilitado no Keycloak; access token TTL curto (5–15 min)
- API nunca confia em `tenant_id` do body — só do JWT validado

### Arquitetura front/back separados

- **Frontend (web + mobile):** UI + OIDC login + `packages/api-client` — sem acesso direto ao Postgres/MinIO
- **API (`apps/api`):** negócio, RBAC, validação Zod, presign MinIO, webhooks
- Rotas REST versionadas: `/v1/vehicle-entries`, `/v1/customers`, etc.
- Webhooks (Stripe, Chatwoot): endpoints na **API**, nunca no Next.js
- Realtime board: **SSE/WebSocket na API** + Redis pub/sub
- Deploy independente: web (CDN) ≠ api ≠ keycloak ≠ postgres (containers Swarm/K8s)

### Multi-tenant & multi-filial (RLS + tenant_id + branch_id)

- **Modelo:** PostgreSQL self-hosted, schema compartilhado, `tenant_id UUID NOT NULL` em toda tabela de negócio
- **Filiais:** tabela `branches`; `branch_id NOT NULL` em `vehicle_entries`, `payments`, `expenses`
- RLS policy: `tenant_id = current_setting('app.tenant_id', true)::uuid`
- API executa `SET LOCAL app.tenant_id = '<from JWT>'` no início de cada transação
- **Escopo filial:** middleware `branchContext` valida `X-Branch-Id`; queries operacionais filtram `branch_id`; visão consolidada = agregação sem filtro de filial (só admin)
- **RLS obrigatório** em 100% das tabelas de negócio — migration sem policy = rejeitada
- Defense in depth: RLS no Postgres **+** filtro `tenant_id` e `branch_id` explícito nas queries da API
- MinIO: bucket privado, path `{tenant_id}/{branch_id}/photos/...`, presign com TTL curto
- Redis/filas: prefixo `t:{tenant_id}:b:{branch_id}:` em chaves operacionais
- **CI obrigatório:** teste cross-tenant — user tenant A não acessa tenant B; operador filial X não acessa filial Y

### Pagamentos (adapter pattern)

- Interface `PaymentProvider` unificada; adapters: `manual`, `stripe`, `mercadopago`, `stone`, `cielo`
- Tenant pode `disable_integration`: fluxo operacional continua, pagamento = registro manual
- Webhooks idempotentes (dedupe por `event_id` no Redis)
- Nunca passar `payment_method_types` no Stripe exceto Terminal (`card_present`)

### RBAC

- Papéis base: Admin, Gerente, Usuário — mapeados de roles/groups Keycloak
- Admin configura matriz módulo × ação por tenant (Postgres); API valida após JWT
- Middleware API: `auth` → `tenantContext` → `branchContext` → `rbac` → handler

### UX operacional

- **Uma UI só** — sem modos automáticos (Modo Pista rejeitado: complexidade + impacto na dinâmica)
- Home = board de status; financeiro/config em "Mais"
- Máx. 3–4 CTAs primários por tela — inclusive no pico de sábado
- Fila: contador/badge no board, sem troca de layout
- Mobile: bottom nav — Operação | Clientes | Caixa | Mais
- Mensagens de erro em português claro, sem jargão técnico

### Realtime & offline

- Board: SSE/WebSocket API + Redis pub/sub
- Mobile offline: fila local → `POST /v1/sync/batch` ao reconectar

### Integrações

- WhatsApp via Chatwoot API — assíncrono (BullMQ), só com `whatsapp_opt_in`

### Analytics

- **Fase 1:** SQL agregado — **sem LLM**; Qdrant só se busca semântica (Fase 2+)

### Code organization (monorepo Turborepo)

```
apps/
  web/                 → Next.js + Keycloak OIDC
  api/                 → Hono REST API
  mobile/              → Expo + AppAuth
packages/
  shared/              → Zod schemas, tipos
  api-contract/        → DTOs + rotas
  api-client/          → fetch tipado + Bearer token
infra/
  docker/              → compose: postgres, keycloak, redis, minio, api
lava-rapido/           → BMAD tooling
```

### Framework-specific (Hono API)

- Middleware: `requestId` → `auth` (jose + JWKS) → `tenantContext` (SET LOCAL) → `rbac` → handler
- ORM: Drizzle ou Prisma com pool Postgres (pg)
- Health: `GET /health`, `GET /ready` para probes K8s/Swarm

### Critical Don't-Miss Rules

- ❌ Implementar auth próprio (login, hash senha, JWT manual)
- ❌ Usar Supabase (removido do projeto)
- ❌ Acesso direto Postgres/MinIO do frontend
- ❌ Query sem contexto `tenant_id` (RLS + filtro API)
- ❌ Bloquear operação se pagamento integrado falhar — fallback manual sempre
- ❌ Modos de UI automáticos (ex. Modo Pista) — UI minimalista única sempre
- ❌ Qdrant como banco principal de negócio

---

## Usage Guidelines

**For AI Agents:** Ler este arquivo antes de implementar. Auth = Keycloak config, não código custom.

**For Humans:** Atualizar quando stack ou regras mudarem.

_Last Updated: 2026-05-21_

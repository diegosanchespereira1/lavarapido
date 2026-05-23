---
stepsCompleted: [1, 2, 3, 4]
status: final
created: 2026-05-21
updated: 2026-05-21
inputDocuments:
  - planning-artifacts/prds/prd-lava-rapido-2026-05-21/prd.md
  - planning-artifacts/architecture.md
  - planning-artifacts/ux-design-specification.md
  - project-context.md
---

# lava-rapido - Epic Breakdown

## Overview

Decomposição de épicos e stories para o MVP do Lava Rápido SaaS — multi-tenant, multi-filial, board premium soft, operação "+ Lavagem". Cobre FR-1–15 e FR-27–30 do PRD revisão 3.

**Ordem de implementação:** E1 → E2 → E3 → E4 (cada épico entrega valor utilizável).

---

## Requirements Inventory

### Functional Requirements (MVP)

```
FR-1: Login multi-superfície via Keycloak (web MVP); JWT com tenant_id, branch_ids, roles
FR-2: Isolamento de Tenant (RLS + API defense in depth)
FR-3: RBAC base Admin / Gerente / Usuário
FR-4: Registrar Vehicle Entry (placa, tipo, cliente) scoped à filial
FR-5: Validar placa Mercosul + confirmação visual obrigatória
FR-6: Pipeline avanço, retrocesso e cancelamento + realtime board
FR-7: Board de Status como home; badge fila; máx. 4 CTAs primárias
FR-8: Ticket check-in impressão browser
FR-9: WhatsApp check-in assíncrono com opt-in (Chatwoot)
FR-11: CRUD Tipo de Lavagem (nível Tenant)
FR-12: Cadastrar/buscar Cliente (nome, telefone, whatsapp opt-in)
FR-13: Histórico de lavagens por Cliente
FR-14: Pagamento manual por Vehicle Entry
FR-15: Caixa diário simplificado
FR-27: CRUD Filiais; 1 filial default no onboarding
FR-28: Contexto operacional por Filial (API + UI)
FR-29: Visão consolidada e individual (Admin) — caixa e board resumo
FR-30: Cliente compartilhado entre Filiais; histórico com indicação de unidade
```

**Fora do MVP (referência):** FR-10, FR-16–26.

### NonFunctional Requirements (MVP)

```
NFR-1: Board atualiza status ≤2s p95 (SSE + Redis pub/sub)
NFR-2: Tenant isolation — zero cross-tenant em CI
NFR-3: API /health e /ready para orquestração
NFR-4: Logs estruturados tenant_id + branch_id + request_id
NFR-5: Touch targets ≥48px; WCAG AA contraste
NFR-6: Erros API em português { error: { code, message } }
NFR-7: Timezone Tenant America/Sao_Paulo default (caixa)
NFR-8: Secrets gateway/server-side only (prep FR-18)
```

### Additional Requirements (Architecture)

```
- Monorepo Turborepo: apps/web, apps/api, packages/shared, packages/api-client
- Hono API REST /v1/* — frontends sem acesso direto ao Postgres
- PostgreSQL 16 + Drizzle ORM + RLS tenant_id
- Keycloak 26 OIDC — realm lava-rapido; clients web/mobile
- Claims JWT: tenant_id, branch_ids[], default_branch_id
- Header API X-Branch-Id validado no branchContext middleware
- Redis pub/sub t:{tenant_id}:b:{branch_id}:status
- Docker Compose dev: postgres, keycloak, redis, minio, api
- Migrations: criar tabelas apenas quando story exige
- Proibido auth custom — só Keycloak + jose JWKS na API
```

### UX Design Requirements

```
UX-DR1: Design tokens premium — Plus Jakarta Sans, DM Mono, paleta §9, shadows, radius 14px
UX-DR2: Background gradient app + ambient tint por coluna board
UX-DR3: Header glass gradient primary-deep → primary
UX-DR4: BranchContextSwitcher pill glass
UX-DR5: VehicleEntryCard com PlateChip + accent bar gradient
UX-DR6: BoardColumn + CountPill
UX-DR7: FAB "+ Lavagem" gradient + shadow-fab
UX-DR8: Bottom nav glass — Board | Lavagem | Caixa | Mais
UX-DR9: PlateConfirmScreen hero (placa 40px frame Mercosul)
UX-DR10: Nova lavagem sheet full-screen premium
UX-DR11: Motion spring cards 280ms; reduced-motion fallback
UX-DR12: CashRegisterSummary consolidado + drill-down filial
UX-DR13: Admin board resumo consolidado (stat tiles, não cards misturados)
```

### FR Coverage Map

| FR | Epic | Story |
|----|------|-------|
| FR-1 | E1 | 1.3, 1.4 |
| FR-2 | E1 | 1.5, 1.6, 1.9 |
| FR-3 | E1 | 1.5 |
| FR-27 | E1 | 1.6, 1.7, 1.10 |
| FR-28 | E1, E2 | 1.8, 2.1 |
| FR-4 | E2 | 2.4, 2.6 |
| FR-5 | E2 | 2.5, 2.6 |
| FR-6 | E2 | 2.7, 2.8 |
| FR-7 | E2 | 2.1, 2.2, 2.3 |
| FR-8 | E2 | 2.9 |
| FR-9 | E2 | 2.10 |
| FR-11 | E3 | 3.1, 3.2 |
| FR-12 | E3 | 3.3, 3.4 |
| FR-13 | E3 | 3.5 |
| FR-30 | E3 | 3.5 |
| FR-14 | E4 | 4.1, 4.2 |
| FR-15 | E4 | 4.3, 4.4 |
| FR-29 | E4 | 4.5, 4.6 |

---

## Epic List

### Epic 1: Acesso, Tenant e Filiais
Dono e equipe entram com segurança; tenant isolado; filiais cadastradas; contexto de unidade ativo na sessão.
**FRs:** FR-1, FR-2, FR-3, FR-27, FR-28 (base)

### Epic 2: Board Premium e Operação "+ Lavagem"
Operador vê a fila, registra lavagem, move pipeline, imprime ticket e dispara WhatsApp check-in — UI premium soft.
**FRs:** FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-28 (operacional)

### Epic 3: Catálogo e Clientes
Admin configura tipos de lavagem; equipe cadastra clientes e consulta histórico multi-filial.
**FRs:** FR-11, FR-12, FR-13, FR-30

### Epic 4: Caixa e Visão do Dono
Pagamento manual, caixa do dia por filial e consolidado; board resumo para admin.
**FRs:** FR-14, FR-15, FR-29

---

## Epic 1: Acesso, Tenant e Filiais

Dono e equipe autenticam via Keycloak; dados isolados por tenant; filiais gerenciáveis; app sabe qual unidade está ativa.

### Story 1.1: Scaffold monorepo Turborepo

As a **desenvolvedor**,
I want **monorepo com apps/web, apps/api e packages/shared**,
So that **front e back evoluem juntos com tipos compartilhados**.

**Acceptance Criteria:**

**Given** repositório lava-rapido  
**When** executo `turbo dev`  
**Then** Next.js web e Hono API iniciam com health check  
**And** `packages/shared` exporta enums de status do Pipeline  
**And** `packages/api-client` existe com fetch tipado stub  

**Refs:** Architecture §8

---

### Story 1.2: Stack Docker local (Postgres, Keycloak, Redis, MinIO)

As a **desenvolvedor**,
I want **docker-compose com serviços de infra**,
So that **ambiente local espelha produção self-hosted**.

**Acceptance Criteria:**

**Given** Docker instalado  
**When** executo `docker compose up` em `infra/docker/`  
**Then** Postgres 16, Keycloak 26, Redis 7 e MinIO sobem  
**And** API responde `GET /health` 200 e `GET /ready` 200 quando PG+Redis ok  

**Refs:** NFR-3

---

### Story 1.3: Keycloak realm, clients e JWT mappers

As a **admin de plataforma**,
I want **realm lava-rapido com clients web e claims tenant/filial**,
So that **API receba tenant_id e branch_ids no token**.

**Acceptance Criteria:**

**Given** Keycloak rodando  
**When** usuário faz login no client `lava-rapido-web`  
**Then** access_token contém `sub`, `tenant_id`, `branch_ids`, `default_branch_id`, roles  
**And** refresh token rotation habilitado; access TTL 5–15 min  

**Refs:** FR-1, Architecture ADR-002

---

### Story 1.4: Login web OIDC e rotas protegidas

As a **operador ou admin**,
I want **entrar pelo web com Keycloak**,
So that **acesse o app sem cadastro local de senha**.

**Acceptance Criteria:**

**Given** usuário não autenticado  
**When** acessa `/board`  
**Then** redireciona para Keycloak login  
**When** autentica com sucesso  
**Then** retorna à rota original  
**When** sessão expira  
**Then** reauth preserva rota de destino  

**Refs:** FR-1

---

### Story 1.5: Middleware API — auth, tenant, branch, RBAC

As a **sistema**,
I want **cadeia de middleware na API Hono**,
So that **cada request seja autenticado, scoped e autorizado**.

**Acceptance Criteria:**

**Given** request com Bearer JWT válido e header `X-Branch-Id`  
**When** branch_id ∈ branch_ids do token (ou role admin)  
**Then** handler recebe contexto tenant + branch + roles  
**When** user role `user` tenta endpoint admin-only  
**Then** 403 com mensagem em português  
**When** tenant_id no body difere do JWT  
**Then** ignorado — só JWT vale  

**Refs:** FR-2, FR-3, FR-28

---

### Story 1.6: Migrations tenants, branches e RLS

As a **sistema**,
I want **tabelas tenants e branches com RLS**,
So that **dados nunca vazem entre tenants**.

**Acceptance Criteria:**

**Given** migration aplicada  
**When** consulto `tenants` e `branches`  
**Then** `branches` tem tenant_id, name, address, active  
**And** RLS policy `tenant_id = current_setting('app.tenant_id')` em branches  
**When** novo tenant é provisionado  
**Then** 1 filial default "Unidade Principal" é criada automaticamente  

**Refs:** FR-2, FR-27, NFR-2

---

### Story 1.7: API CRUD Filiais

As a **admin**,
I want **criar, editar e desativar filiais via API**,
So that **cadastro de pontos físicos funcione antes da UI admin**.

**Acceptance Criteria:**

**Given** admin autenticado  
**When** `POST /v1/branches` com name obrigatório  
**Then** filial criada no tenant  
**When** `PATCH /v1/branches/:id` desativa filial  
**Then** `active=false`; novos vehicle entries bloqueados nessa filial  
**When** operador lista filiais  
**Then** só vê filiais do seu tenant  

**Refs:** FR-27

---

### Story 1.8: BranchContextSwitcher web + api-client

As a **operador ou admin**,
I want **selecionar filial ativa ou consolidado no header**,
So that **board e caixa mostrem dados do contexto certo**.

**Acceptance Criteria:**

**Given** admin com 3 filiais  
**When** abre switcher pill glass  
**Then** vê "Todas as unidades" + lista de filiais  
**When** seleciona filial  
**Then** api-client envia `X-Branch-Id` em todas as requests  
**Given** operador com 1 filial  
**Then** switcher mostra nome fixo sem dropdown  
**And** última seleção persiste em localStorage  

**Refs:** FR-28, UX-DR4

---

### Story 1.9: Teste CI cross-tenant

As a **equipe**,
I want **teste automatizado de isolamento**,
So that **regressões de segurança sejam detectadas**.

**Acceptance Criteria:**

**Given** users tenant A e tenant B com tokens válidos  
**When** user A requesta recurso de tenant B  
**Then** teste falha (403 ou 404)  
**And** pipeline CI executa teste em todo PR  

**Refs:** FR-2, NFR-2

---

### Story 1.10: UI admin — lista e form Filiais

As a **admin**,
I want **gerenciar filiais em Configurações**,
So that **novos pontos apareçam no switcher** (UJ-5).

**Acceptance Criteria:**

**Given** admin em Config → Filiais  
**When** adiciona unidade com nome + endereço opcional  
**Then** filial aparece na lista e no BranchContextSwitcher em ≤2s  
**When** desativa filial  
**Then** some do switcher operacional; permanece no histórico  

**Refs:** FR-27, UJ-5

---

## Epic 2: Board Premium e Operação "+ Lavagem"

Operador usa board como home premium; registra lavagem; move carros; imprime ticket; WhatsApp check-in.

### Story 2.1: Design system premium — tokens e layout shell

As a **operador**,
I want **app com visual premium soft desde o primeiro login**,
So that **confie no produto na pista**.

**Acceptance Criteria:**

**Given** usuário autenticado  
**When** carrega qualquer tela operacional  
**Then** Plus Jakarta Sans e DM Mono carregadas via next/font  
**And** CSS variables: primary, accent, shadows, background-gradient  
**And** header glass gradient 64px + bottom nav glass 72px  
**And** touch targets ≥48px  

**Refs:** UX-DR1–3, UX-DR8, NFR-5

---

### Story 2.2: Board premium — colunas, FAB "+ Lavagem", badge fila

As a **operador**,
I want **board Kanban como home com "+ Lavagem"**,
So that **veja a fila e inicie atendimento rápido** (FR-7).

**Acceptance Criteria:**

**Given** operador na filial ativa  
**When** abre app  
**Then** home = board com 4 colunas (Preparação, Lavando, Finalização, Pronto)  
**And** ambient tint por coluna; scroll horizontal mobile  
**And** FAB "+ Lavagem" visível; badge "N na fila" no header  
**And** máx. 4 CTAs primárias visíveis (Board, Lavagem, Caixa, Mais)  

**Refs:** FR-7, UX-DR6–8

---

### Story 2.3: Componentes VehicleEntryCard e BoardColumn

As a **operador**,
I want **cards elevados com placa em destaque**,
So that **identifique carros rapidamente ao sol**.

**Acceptance Criteria:**

**Given** entries na filial  
**When** board renderiza  
**Then** cada card tem PlateChip DM Mono, tipo lavagem, cliente, time-chip  
**And** accent bar gradient no topo por status  
**And** coluna Pronto tem glow accent sutil  
**When** lista vazia  
**Then** empty state com ilustração line-art + CTA "+ Lavagem"  

**Refs:** UX-DR5–6

---

### Story 2.4: API Vehicle Entries scoped por filial

As a **operador**,
I want **registrar e listar atendimentos da minha filial**,
So that **dados operacionais fiquem no ponto certo**.

**Acceptance Criteria:**

**Given** migration `vehicle_entries` com tenant_id + branch_id  
**When** `GET /v1/vehicle-entries` com X-Branch-Id  
**Then** retorna só entries da filial  
**When** `POST` cria entry  
**Then** status inicial `preparation`; branch_id = contexto ativo  
**And** RLS impede cross-tenant  

**Refs:** FR-4, FR-28

---

### Story 2.5: Validação Mercosul e PlateConfirmScreen

As a **operador**,
I want **validar e confirmar placa antes de salvar**,
So that **não erre placa sob pressa** (FR-5).

**Acceptance Criteria:**

**Given** fluxo "+ Lavagem"  
**When** digito placa fora padrão Mercosul (ABC1D23)  
**Then** erro inline em português; não avança  
**When** placa válida  
**Then** PlateConfirmScreen hero — placa 40px frame Mercosul  
**When** confirmo  
**Then** avanço para tipo/cliente  
**When** placa similar existe nas últimas 24h  
**Then** sugere "Você quis dizer…?"  

**Refs:** FR-5, UX-DR9

---

### Story 2.6: Fluxo Nova lavagem completo

As a **operador**,
I want **completar registro em sheet premium**,
So that **carro entre na fila em ≤45s** (SM-1).

**Acceptance Criteria:**

**Given** placa confirmada  
**When** seleciono tipo lavagem + cliente (tel busca existente)  
**Then** `POST /v1/vehicle-entries` persiste  
**And** card aparece coluna Preparação em ≤3s  
**And** sheet fecha; toast sucesso; retorno ao board  

**Refs:** FR-4, UX-DR10

---

### Story 2.7: Pipeline — avanço, retrocesso e cancelamento

As a **operador**,
I want **mover carro entre etapas ou cancelar**,
So that **pipeline reflita a pista real** (FR-6).

**Acceptance Criteria:**

**Given** card em qualquer coluna não terminal  
**When** toco card → Próximo  
**Then** `PATCH /v1/vehicle-entries/:id/status` avança etapa  
**When** escolho Voltar  
**Then** retrocede (ex. Finalização → Lavando)  
**When** Cancelar com confirmação  
**Then** status `canceled`; card sai do board; permanece histórico  
**And** animação spring 280ms ao mover card  

**Refs:** FR-6, UX-DR11

---

### Story 2.8: Realtime SSE board

As a **operador**,
I want **ver mudanças de colegas em tempo real**,
So that **board esteja sempre atualizado**.

**Acceptance Criteria:**

**Given** dois operadores mesma filial  
**When** um move status  
**Then** outro vê update em ≤2s p95 via `GET /v1/events/stream`  
**And** Redis pub/sub `t:{tenant_id}:b:{branch_id}:status`  

**Refs:** FR-6, NFR-1

---

### Story 2.9: Ticket check-in impressão

As a **operador**,
I want **imprimir comprovante após registrar**,
So that **cliente receba ticket físico** (FR-8).

**Acceptance Criteria:**

**Given** entry criado  
**When** toco "Imprimir ticket"  
**Then** abre view print-friendly com placa, tipo, data/hora, id atendimento  
**And** gera em ≤3s; funciona via window.print()  

**Refs:** FR-8

---

### Story 2.10: WhatsApp check-in assíncrono

As a **operador**,
I want **cliente com opt-in receba confirmação WhatsApp**,
So that **comunicação profissional sem bloquear fila** (FR-9).

**Acceptance Criteria:**

**Given** cliente whatsapp_opt_in=true  
**When** entry é salvo  
**Then** job BullMQ enfileira mensagem Chatwoot (check-in)  
**When** cliente sem opt-in  
**Then** nenhuma mensagem  
**When** Chatwoot falha  
**Then** entry permanece salvo; erro logado; operador não bloqueado  

**Refs:** FR-9

---

## Epic 3: Catálogo e Clientes

Admin configura serviços; equipe gerencia clientes e histórico multi-filial.

### Story 3.1: API CRUD Tipos de Lavagem

As a **admin**,
I want **gerenciar catálogo de serviços via API**,
So that **tipos estejam disponíveis no fluxo "+ Lavagem"**.

**Acceptance Criteria:**

**Given** migration `wash_types` (tenant_id, name, price_cents, duration_min, active)  
**When** admin CRUD `/v1/wash-types`  
**Then** tipos inativos não aparecem no select de nova lavagem  
**When** altero preço  
**Then** entries fechados mantêm preço original  

**Refs:** FR-11

---

### Story 3.2: UI admin Tipos de Lavagem

As a **admin**,
I want **tela Config → Tipos de lavagem**,
So that **configure preços sem suporte** (UJ-4).

**Acceptance Criteria:**

**Given** admin autenticado  
**When** cria "Completa SUV" R$ 80  
**Then** tipo disponível no fluxo "+ Lavagem" imediatamente  
**And** UI segue tokens premium (forms, cards)  

**Refs:** FR-11, UJ-4

---

### Story 3.3: API CRUD Clientes + busca

As a **operador**,
I want **cadastrar e buscar clientes por telefone/nome**,
So that **reutilize dados rapidamente**.

**Acceptance Criteria:**

**Given** migration `customers` (tenant_id, name, phone, whatsapp_opt_in)  
**When** busco telefone parcial  
**Then** resultados em ≤2s  
**When** crio cliente  
**Then** visível em todo tenant (qualquer filial)  

**Refs:** FR-12, FR-30

---

### Story 3.4: Cliente inline no fluxo "+ Lavagem"

As a **operador**,
I want **buscar cliente por tel ao registrar lavagem**,
So that **não redigite nome de recorrentes**.

**Acceptance Criteria:**

**Given** sheet nova lavagem  
**When** digito telefone  
**Then** autocomplete clientes existentes  
**When** seleciono existente  
**Then** nome preenche; opt-in WhatsApp respeitado  
**When** novo cliente  
**Then** cadastro inline nome + tel + opt-in  

**Refs:** FR-12

---

### Story 3.5: Histórico cliente multi-filial

As a **gerente ou admin**,
I want **ver lavagens do cliente em todas as unidades**,
So that **atenda cliente fiel com contexto** (FR-30).

**Acceptance Criteria:**

**Given** cliente com lavagens em Filial A e B  
**When** abro histórico  
**Then** lista entries com badge nome da filial  
**And** ordenação por data desc  

**Refs:** FR-13, FR-30

---

## Epic 4: Caixa e Visão do Dono

Pagamento manual, caixa diário, visão consolidada e drill-down por filial.

### Story 4.1: API pagamento manual

As a **operador**,
I want **marcar lavagem como paga manualmente**,
So that **feche com maquininha desacoplada** (FR-14).

**Acceptance Criteria:**

**Given** entry status Pronto  
**When** `POST /v1/payments` com method (dinheiro, pix, cartão)  
**Then** payment vinculado a vehicle_entry + branch_id  
**And** funciona sem gateway configurado  

**Refs:** FR-14

---

### Story 4.2: UI registrar pagamento no card

As a **operador**,
I want **registrar pagamento em 2 toques no card**,
So that **não saia do board**.

**Acceptance Criteria:**

**Given** card em Pronto não pago  
**When** toco "Receber"  
**Then** sheet forma pagamento → confirma  
**And** card mostra indicador pago  

**Refs:** FR-14

---

### Story 4.3: API caixa diário por filial

As a **proprietário**,
I want **total do dia por filial via API**,
So that **números confiáveis para fechamento**.

**Acceptance Criteria:**

**Given** `GET /v1/cash-register?date=YYYY-MM-DD&branch_id=`  
**When** filial especificada  
**Then** soma payments do dia timezone America/Sao_Paulo  
**And** lista entradas detalhadas  

**Refs:** FR-15, NFR-7

---

### Story 4.4: UI Caixa premium por filial

As a **proprietário**,
I want **tela Caixa com visual premium**,
So that **entenda faturamento do dia** (UJ-3).

**Acceptance Criteria:**

**Given** filial selecionada no switcher  
**When** abro Caixa  
**Then** CashRegisterSummary: total dia, lista lavagens pagas, saldo  
**And** tokens premium; drill-down em entry  

**Refs:** FR-15, UX-DR12, UJ-3

---

### Story 4.5: Caixa consolidado admin

As a **admin multi-filial**,
I want **caixa consolidado default com breakdown por unidade**,
So that **veja total e compare pontos** (FR-29).

**Acceptance Criteria:**

**Given** admin com switcher "Todas as unidades"  
**When** abre Caixa  
**Then** total consolidado + cards por filial clicáveis  
**When** clica filial  
**Then** drill-down caixa da unidade em ≤2 toques  

**Refs:** FR-29, UJ-3

---

### Story 4.6: Board resumo consolidado admin

As a **admin**,
I want **board resumo quando consolidado**,
So that **supervise todas as unidades sem cards misturados**.

**Acceptance Criteria:**

**Given** switcher "Todas as unidades"  
**When** home admin  
**Then** stat tiles por coluna (contagem agregada) + breakdown por filial  
**When** clica filial  
**Then** navega board Kanban completo daquela unidade  

**Refs:** FR-29, UX-DR13

---

## Validation Summary

| Check | Status |
|-------|--------|
| FR MVP 1–15, 27–30 cobertos | ✅ |
| NFRs endereçados em stories | ✅ |
| UX-DR1–13 mapeados E2/E4 | ✅ |
| Tabelas criadas just-in-time | ✅ |
| Sem dependência forward entre stories | ✅ |
| Épicos por valor de usuário | ✅ |

---

## Próximos workflows

| Workflow | Quando |
|----------|--------|
| `bmad-check-implementation-readiness` | Antes de sprint 1 |
| Implementação E1 Story 1.1 | Scaffold monorepo |
| `bmad-help` | Rotear próximo passo BMAD |

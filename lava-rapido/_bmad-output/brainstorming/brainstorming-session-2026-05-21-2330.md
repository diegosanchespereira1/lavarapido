---
stepsCompleted: [1, 2, 3, 4]
session_active: false
workflow_completed: true
inputDocuments:
  - planning-artifacts/brief-addendum.md
  - project-context.md
session_topic: 'Produto inteiro Lava Rápido SaaS — riscos a mitigar e arquitetura para 1000+ tenants'
session_goals: 'Identificar riscos técnicos, operacionais e de negócio; definir stack escalável para SaaS multi-tenant em alta escala'
architecture_decision:
  multi_tenant: shared_database_rls
  frontend_backend: separated
  api_framework: hono
  database: postgresql_self_hosted
  auth: keycloak_oidc
  storage: minio
  rejected: [supabase, custom_auth, qdrant_as_primary_db]
ideas_generated:
  - 'RLS-001 through RLS-002'
  - 'ARCH-001 through ARCH-002'
  - 'AUTH-001'
  - 'DATA-001'
  - 'CHAOS-001 through CHAOS-017'
  - 'HAT-black-yellow synthesis'
  - 'PRIORITY-P0 through P2 matrix'
current_technique: 'Idea Organization (Step 4)'
technique_phase: complete
context_file: planning-artifacts/brief-addendum.md
---

# Brainstorming Session Results

**Facilitador:** Diego
**Data:** 2026-05-21

## Session Overview

**Tópico:** Produto inteiro Lava Rápido SaaS — riscos a mitigar e arquitetura para 1000+ tenants

**Objetivos:**
- Mapear riscos técnicos, operacionais, de negócio e compliance
- Validar escolhas de stack para SaaS multi-tenant (1000+ tenants)
- Garantir ferramentas escaláveis sem over-engineering no MVP

**Decisão arquitetural (final):**
- **RLS + `tenant_id`** — PostgreSQL self-hosted
- **Keycloak** — auth OIDC (não desenvolver auth)
- **MinIO** — fotos; **Redis** — filas/realtime
- **Front/back separados** — Next.js + Expo | Hono API
- **Removido:** Supabase Cloud

### Context Guidance

Baseado no `brief-addendum.md`: multi-tenant desde dia 1, pagamentos desacopláveis, mobile Expo, WhatsApp via Chatwoot, RBAC configurável, offline-tolerante na operação.

**Nota:** isolamento via **RLS + tenant_id** confirmado na sessão de brainstorming 2026-05-21.

### Session Setup

Diego quer pensar o **produto inteiro** com foco em **riscos a mitigar**, priorizando tecnologia SaaS capaz de escalar para **mais de 1000 tenants** com ferramentas escaláveis.

## Technique Selection

**Abordagem:** AI-Recommended Techniques

**Sequência recomendada:**

1. **Reverse Brainstorming** — "Como garantir que vazamento aconteça?" → revela controles necessários
2. **Chaos Engineering** — estressar 1000 DBs, pico sábado, tenant malicioso, migration failure
3. **Six Thinking Hats (Black + Yellow)** — riscos vs benefícios do DB-per-tenant
4. **Constraint Mapping** — caminhos viáveis de implementação sem matar operação

**Rationale:** combinação ideal para riscos + decisão arquitetural + escala 1000+.

## Decisões & Mitigações RLS

### Decisão: RLS + tenant_id (PostgreSQL self-hosted)

| Camada | Regra |
|--------|-------|
| Banco | PostgreSQL self-hosted; `tenant_id` + RLS via `app.tenant_id` session var |
| Auth | Keycloak OIDC — JWT com claim `tenant_id` |
| API | `jose` + JWKS; `SET LOCAL app.tenant_id` por request |
| Storage | MinIO presigned URLs |
| Realtime | SSE/WebSocket API + Redis |

### Riscos RLS a mitigar (prioridade)

1. **Policy ausente em tabela nova** → checklist migration + lint SQL
2. **Service role bypass acidental no client** → ESLint rule, zero anon key com bypass
3. **JWT sem tenant_id** → claim obrigatório no signup; middleware rejeita token incompleto
4. **Realtime vazamento** → RLS na publication + filtro client-side redundante
5. **Backup/export LGPD** → função `export_tenant(tenant_id)` com service role auditada

## Decisão: Frontend e Backend separados

**Diego:** front e back deployados separadamente para arquitetura mais robusta.

| Decisão | Detalhe |
|---------|---------|
| Frontend | Next.js (`apps/web`) + Expo (`apps/mobile`) — UI only |
| Backend | Hono REST API (`apps/api`) — Docker Swarm → K8s |
| Contrato | `packages/api-client` + `packages/api-contract` |
| Supabase | **Removido** |
| Keycloak | Auth OIDC self-hosted — configurar realm, não codificar login |
| Postgres | RLS + tenant_id |
| MinIO | Fotos via API |
| Deploy | Web (Vercel/CDN) ≠ API (containers) — escala independente |

### Benefícios

- Web e mobile consomem **a mesma API**
- Redeploy do front sem tocar backend (e vice-versa)
- API escala no Swarm/K8s; front escala no CDN
- Superfície de ataque menor — credenciais DB nunca no browser
- Webhooks e jobs centralizados na API

### Riscos a mitigar (front/back separado)

1. **Latência extra** (front → API → DB) → cache Redis, queries otimizadas, CDN para assets
2. **CORS/auth** → cookie httpOnly ou Bearer; refresh token na API
3. **Duplicação de validação** → Zod único em `packages/shared`
4. **Realtime** → SSE/WebSocket na API ou token curto emitido pela API
5. **Offline mobile** → fila local sync via `POST /v1/sync/batch`

---

## Técnica 2: Chaos Engineering — "E se tudo der errado no sábado?"

**Cenário base:** sábado 10h, 847 tenants ativos, fila de 12 carros no lava-rápido do Seu João, sol forte, operador com luva molhada, 4G instável.

### Domínio: Operação & pico

**[CHAOS-001]: Modo Pista**
_Concept:_ UI entra em "modo pista" automático quando >5 carros na fila — só 3 botões gigantes: Entrar | Próximo status | Pronto. Esconde financeiro, config, relatórios.
_Novelty:_ Degrada gracefully sem admin configurar; detecta fila via contagem local + sync.

**[CHAOS-002]: Status fantasma**
_Concept:_ Operador marca "Pronto" mas cliente já foi embora — carro fica órfão no board. Mitigação: auto-arquivar após 2h + badge "aguardando retirada" + WhatsApp opcional.
_Novelty:_ Trata abandono como estado de negócio, não bug.

**[CHAOS-003]: Dois operadores, um carro**
_Concept:_ Dois funcionários mudam status do mesmo veículo simultaneamente offline. Mitigação: vector clock leve por `vehicle_entry` + toast "João já atualizou este carro".
_Novelty:_ Conflito visível na UI, não silent overwrite.

**[CHAOS-004]: Placa digitada errada**
_Concept:_ ABC1D23 vs ABC1234 — lavagem registrada no carro errado. Mitigação: confirmação visual grande da placa + foto opcional da traseira + busca fuzzy "placa parecida?".
_Novelty:_ UX de confirmação antes de irreversível, não validação regex seca.

### Domínio: Pagamentos & caixa

**[CHAOS-005]: Maquininha sumiu**
_Concept:_ Stone/Cielo offline; operador precisa fechar caixa. Fluxo "fechamento incompleto" — registra lavagens como "a receber" e reconcilia depois.
_Novelty:_ Caixa não trava; pendência é first-class no ledger.

**[CHAOS-006]: Webhook duplicado**
_Concept:_ Stripe/Mercado Pago envia mesmo webhook 3x. Mitigação: idempotency key Redis TTL 72h + resposta 200 idempotente.
_Novelty:_ Teste de chaos injeta webhooks duplicados em staging.

**[CHAOS-007]: Troco errado**
_Concept:_ Operador registra R$50 dinheiro mas cliente pagou R$45. Mitigação: campo "valor informado" vs "valor serviço" + alerta soft se divergir >R$1.
_Novelty:_ Não bloqueia — registra divergência para admin revisar no fechamento.

### Domínio: UX / humano

**[CHAOS-008]: Operador analfabeto funcional**
_Concept:_ Não lê "Finalização" — usa ícones + cores + áudio opcional ("carro em lavagem"). Texto secundário, cor primária.
_Novelty:_ Acessibilidade operacional, não WCAG genérico.

**[CHAOS-009]: Sol no celular**
_Concept:_ Tela ilegível ao ar livre. Mitigação: alto contraste automático outdoor + botões com borda grossa + modo escuro desabilitado na pista.
_Novelty:_ Detecta luminosidade ou toggle manual "modo sol".

**[CHAOS-010]: Dono esqueceu senha sexta 22h**
_Concept:_ Keycloak recovery lento; dono quer ver caixa. Mitigação: magic link SMS via telefone cadastrado + backup code impresso no onboarding.
_Novelty:_ Recovery alinhado ao perfil (telefone > email para dono de lava-rápido).

### Domínio: Infra & escala

**[CHAOS-011]: Keycloak cai, pista continua**
_Concept:_ JWT cache local 15min no mobile — operação de status continua offline; sync quando IdP volta. Login novo bloqueado com banner claro.
_Novelty:_ Degraded mode explícito por feature, não all-or-nothing.

**[CHAOS-012]: Postgres lento no pico**
_Concept:_ 1000 tenants, queries pesadas de analytics derrubam OLTP. Mitigação: read replica + analytics só na replica; API operacional nunca faz JOIN pesado.
_Novelty:_ Separação OLTP/OLAP desde MVP do relatório.

**[CHAOS-013]: MinIO cheio**
_Concept:_ Fotos de avaria enchem disco. Mitigação: lifecycle 90 dias + compressão + alerta 80% + upgrade path S3 tiering.
_Novelty:_ Fotos são evidência, não arquivo eterno — política de retenção no produto.

### Domínio: Negócio SaaS

**[CHAOS-014]: Tenant malicioso scrape**
_Concept:_ Competidor cria conta trial e scrape API. Mitigação: rate limit por tenant + anomaly detection (requests/min) + captcha no signup.
_Novelty:_ Abuse prevention como feature de plataforma, não afterthought.

**[CHAOS-015]: Churn silencioso**
_Concept:_ Lava-rápido para de usar mas não cancela — dados ocupam espaço. Mitigação: "conta dormente" após 30 dias sem login + email + arquivamento cold storage.
_Novelty:_ Lifecycle de tenant automatizado com win-back.

### Domínio: Compliance & WhatsApp

**[CHAOS-016]: WhatsApp ban**
_Concept:_ Chatwoot/número bloqueado por spam. Mitigação: template aprovado, rate limit 1 msg/cliente/dia, opt-in obrigatório, fallback SMS.
_Novelty:_ Canal de mensagem com circuit breaker — app continua, WhatsApp pausa.

**[CHAOS-017]: Cliente nega opt-in**
_Concept:_ Funcionário marca WhatsApp sem consentimento. Mitigação: primeiro envio pede confirmação "Responda SIM" + audit log de quem marcou flag.
_Novelty:_ Consentimento verificável, não só checkbox.

---

## Técnica 3: Six Thinking Hats — síntese Black / Yellow

### Chapéu preto (riscos top — mitigar no MVP)

| # | Risco | Mitigação MVP |
|---|-------|---------------|
| 1 | Vazamento cross-tenant | RLS + CI test + JWT tenant_id |
| 2 | Placa errada (CHAOS-004) | Confirmação visual + busca fuzzy |
| 3 | Maquininha offline (CHAOS-005) | Pagamento manual first-class |
| 4 | Fila sábado (CHAOS-001) | UI única minimalista + board com contador; **sem modo automático** |
| 5 | Keycloak down (CHAOS-011) | JWT cache mobile + degraded mode |
| 6 | Webhook duplicado (CHAOS-006) | Redis idempotency |
| 7 | Operador low-literacy (CHAOS-008) | Ícones + cores > texto |

### Chapéu amarelo (oportunidades)

- Modo Pista = ~~diferencial UX~~ **rejeitado** — UI única simples é o diferencial
- Pagamento desacoplado = vende para qualquer maquininha
- Self-hosted stack = controle de custo em escala
- Keycloak = argumento de segurança para tenant enterprise
- Offline operacional = funciona onde 4G falha

---

## Idea Organization and Prioritization

### Temas emergentes

**Tema 1 — Fundação técnica SaaS**
RLS, Keycloak, Hono API, Postgres, front/back separados, MinIO, Redis.

**Tema 2 — Operação na pista**
Modo Pista, placa, status conflito, offline sync, modo sol, ícones.

**Tema 3 — Financeiro resiliente**
Pagamento manual, webhook idempotente, fechamento incompleto, divergência de troco.

**Tema 4 — Plataforma & escala**
Rate limit, tenant dormente, OLTP/replica analytics, lifecycle fotos MinIO.

**Tema 5 — Comunicação & compliance**
WhatsApp opt-in verificável, circuit breaker, fallback SMS.

### Matriz de prioridade

| Prioridade | Itens | Epic alvo |
|------------|-------|-----------|
| **P0 — MVP** | RLS + Keycloak + API Hono + placa confirm + pagamento manual + board status SSE + **UI minimalista única** | E1, E2, E4 |
| **P1 — Fase 2** | Offline sync, webhook idempotency, fotos MinIO, RBAC configurável, fechamento caixa | E5, E6, E8 |
| **P2 — Fase 3+** | WhatsApp circuit breaker, analytics replica, tenant lifecycle, rate limit abuse | E9, E12 |

### Top 5 decisões de produto (impacto × viabilidade)

1. **Confirmação de placa (CHAOS-004)** — previne erro caro
2. **Pagamento manual always-on (CHAOS-005)** — desbloqueia adoção
3. **RLS + defense in depth** — confiança SaaS
4. **UI única minimalista** — poucos botões sempre; sem "modo pista" automático *(decisão Diego)*
5. **JWT degraded mode (CHAOS-011)** — resiliência no sábado

### Decisão revisada: Modo Pista (CHAOS-001) — **rejeitado**

**Feedback Diego:** modo automático gera complexidade (dois layouts, detecção de fila, testes duplicados) e pode **impactar a dinâmica** operacional (operador perde referência quando UI muda).

**Substituto (P0):**
- **Uma UI só** — home = board de status; financeiro/config sempre em "Mais"
- Máx. 3–4 CTAs em qualquer tela, inclusive no pico de sábado
- Fila visível no board (contador/badge), sem trocar interface
- Opcional futuro (P2): toggle manual "tela cheia operação" — **opt-in**, nunca automático

---

## Action Planning

### Plano 1 — Documentar arquitetura (esta semana)

1. Rodar workflow `bmad-create-architecture` com decisões desta sessão
2. Diagrama C4: Web/Mobile → Keycloak → API → Postgres/Redis/MinIO
3. ADR: RLS session var, Keycloak tenant claim, SSE realtime

**Recursos:** `project-context.md`, `brief-addendum.md`, esta sessão  
**Sucesso:** `architecture.md` aprovado no `_bmad-output/planning-artifacts/`

### Plano 2 — Infra local Swarm (próximo)

1. `docker-compose.yml`: postgres, keycloak, redis, minio, api (stub)
2. Realm Keycloak `lava-rapido` + clients web/mobile/api
3. Migration inicial Postgres: `tenants`, RLS template

**Sucesso:** `docker compose up` + login Keycloak + health API

### Plano 3 — Monorepo scaffold

1. Turborepo: `apps/web`, `apps/api`, `packages/shared`, `packages/api-client`
2. Migrar Next.js raiz → `apps/web`
3. Hono stub `/v1/health` + middleware JWT

**Sucesso:** web + api dev simultâneo

### Plano 4 — PRD & épicos

1. Rodar `bmad-prd` incorporando CHAOS P0 como requisitos não-funcionais
2. `bmad-create-epics-and-stories` com E1–E4 priorizados
3. UX: UI minimalista única + confirmação placa no `bmad-create-ux-design`

**Sucesso:** PRD + épicos P0 prontos para sprint

---

## Session Summary and Insights

**Conquistas:**
- 23+ riscos/ideias documentados em 3 técnicas (Reverse Brainstorming, Chaos Engineering, Six Hats)
- Stack fechada: Postgres RLS + Keycloak + Hono + MinIO + Redis + front/back separados
- Supabase removido; auth terceirizado (Keycloak)
- 5 features operacionais P0 identificadas além da arquitetura

**Insight central:** o lava-rápido não falha na arquitetura — falha no **sábado às 10h**. Placa confirmada + pagamento manual + **UI que não muda** são tão críticos quanto RLS.

**Próximo workflow BMAD recomendado:** `bmad-create-architecture` → `bmad-prd` → `docker-compose` + monorepo scaffold

**Sessão concluída:** 2026-05-21


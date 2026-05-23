# Addendum — Lava Rápido SaaS

> Complemento ao product brief. Conteúdo técnico e de domínio para PRD, arquitetura e épicos.

## Visão

Plataforma **SaaS multi-tenant** para gestão de lava-rápido automotivo. Web + apps nativos (Android/iOS). Foco em **simplicidade operacional**: poucos botões, navegação óbvia, visual premium porém acolhedor para quem não é familiarizado com tecnologia.

## Princípios de produto

| Princípio | Regra |
|-----------|-------|
| Simplicidade | Máx. 3–4 ações primárias por tela |
| Mobile-first operacional | Funcionário usa celular/tablet na pista |
| Offline-tolerante | Cadastro e mudança de status funcionam sem rede; sync ao reconectar |
| Pagamento desacoplável | Integração nativa é opcional por tenant |
| Permissões granulares | Admin define o que Gerente e Usuário veem |
| Escala horizontal | Multi-tenant desde o dia 1 — **RLS + tenant_id** em cluster Postgres |

## Mapa de módulos

### M1 — Operações (core)

**Entrada de veículos**
- Placa (obrigatório), tipo de lavagem, cliente (nome + telefone)
- Fotos opcionais no check-in (avarias / registro visual) → MinIO (presigned URL via API)
- Flag WhatsApp no cadastro do cliente

**Pipeline de status** (Kanban / lista por coluna)
1. Preparação
2. Lavando
3. Finalização
4. Pronto

- Atualização em tempo real (SSE/WebSocket na API + Redis pub/sub)
- Notificação ao cliente quando status = Pronto (se WhatsApp habilitado)

### M2 — Catálogo de serviços

- Proprietário cria tipos de lavagem com nome, preço, duração estimada, ativo/inativo
- Ordenação drag-and-drop na configuração

### M3 — Clientes

- Campos mínimos: **nome**, **telefone**
- Histórico de lavagens vinculado
- Flag `aceita_whatsapp`
- Busca por nome, telefone ou placa

### M4 — Financeiro

- **Receitas**: lavagens concluídas + outras entradas manuais
- **Despesas**: categorias configuráveis, recorrentes opcionais
- **Caixa**: saldo diário, fechamento de turno
- **Comissões** (opcional por funcionário): % ou valor fixo por lavagem/serviço
- Relatórios: faturamento por período, por tipo de lavagem, por funcionário

### M5 — Pagamentos (adapter pattern)

Cada tenant escolhe provedor ou desabilita integração.

| Modo | Comportamento |
|------|---------------|
| Integrado | Webhook confirma pagamento → marca OS como paga |
| Manual | Operador registra forma (dinheiro, PIX externo, cartão na maquininha desacoplada) |
| Desabilitado | Fluxo operacional continua; sem chamadas a APIs de pagamento |

**Provedores alvo (fases):**
- Fase A: registro manual + Stripe (referência internacional)
- Fase B: Mercado Pago, Stone, Cielo (adapters separados, mesma interface)

Interface interna:
```
PaymentProvider → createCharge(), captureWebhook(), refund()
TenantPaymentConfig → provider | disabled | manual_only
```

Maquininhas: integração via SDK/API do provedor quando disponível; fallback sempre manual.

### M6 — Funcionários & RBAC

**Papéis base:** Admin, Gerente, Usuário

**Matriz configurável pelo Admin** (por tenant):
- Módulos: operações, financeiro, relatórios, configurações, estoque, funcionários
- Ações: criar, editar, excluir, visualizar

Cadastro de funcionário: nome, telefone, papel, comissão (opcional), ativo/inativo.

### M7 — Estoque / Insumos

- Funcionário reporta produto acabando ou esgotado (1 toque + quantidade opcional)
- Admin vê fila de reposição
- Sem controle contábil profundo no MVP — alerta operacional

### M8 — Fidelidade (feature extra — pós-MVP)

- Pontos por lavagem ou visitas
- Recompensas configuráveis (ex.: 10ª lavagem com desconto)
- Isolado por tenant; pode ser plano premium SaaS

### M9 — Comunicação WhatsApp (Chatwoot)

- App dispara mensagem via API Chatwoot usando inbox/número do tenant
- Pré-requisito: flag WhatsApp no cliente
- Templates: "seu carro está pronto", confirmação de entrada
- Fila assíncrona (worker) — nunca bloquear UI

### M10 — Analytics & projeções

**Fase 1 — sem LLM (recomendado):**
- SQL + agregações: ticket médio, lavagens/dia, receita vs despesa, sazonalidade simples
- Projeção linear / média móvel dos últimos N dias
- Dashboard com gráficos claros, linguagem simples

**Fase 2 — LLM opcional (decisão do Diego):**
- Narrativas em linguagem natural ("Suas terças-feiras faturam 18% menos")
- Requer custo API + revisão de precisão
- **Recomendação:** só após Fase 1 estável; LLM como camada de insight, não como fonte de números

## UX & identidade visual

**Tom:** premium soft — confiança sem intimidar.

**Paleta sugerida:**
- Primária: `#2B5F8C` (azul petróleo suave)
- Superfície: `#F7F9FB`
- Accent: `#5BA88C` (verde sage)
- Texto: `#1A2332` / secundário `#64748B`
- Alertas: `#E8A838` (âmbar suave, não vermelho agressivo)

**Padrões:**
- Botões grandes (min 48px touch)
- Ícones + rótulo curto (nunca só ícone na operação)
- Bottom navigation no mobile (Operação | Clientes | Caixa | Mais)
- Web: sidebar colapsável com mesmos 4 grupos

## Arquitetura recomendada

### Monorepo (Turborepo) — front e back separados

**Decisão (Diego):** frontend e backend **deployados e evoluídos separadamente** — API única consumida por web e mobile.

```
apps/
  web/            → Next.js 16 (UI only — sem acesso direto ao banco)
  api/            → Hono (REST API TypeScript, Docker)
  mobile/         → Expo (React Native)
  worker/         → Jobs assíncronos (WhatsApp, webhooks) — pode iniciar dentro de api/
packages/
  shared/         → Zod schemas, tipos, regras de negócio
  api-contract/   → contratos de rotas + DTOs compartilhados
  api-client/     → client HTTP tipado (web + mobile)
  ui-tokens/      → cores, tipografia
```

### Camadas & responsabilidades

| Camada | Deploy | Responsabilidade |
|--------|--------|------------------|
| **Frontend web** | Vercel / CDN | UI, formulários, board visual — só chama API |
| **Frontend mobile** | App Store / Play | Mesma API que o web |
| **API** | Docker Swarm → K8s | Negócio, RBAC, webhooks, presign MinIO |
| **Keycloak** | Docker Swarm → K8s | Auth OIDC — **não desenvolvemos auth** |
| **PostgreSQL** | Docker Swarm → K8s | Dados + RLS por `tenant_id` |
| **MinIO** | Docker Swarm → K8s | Fotos (S3-compatible) |
| **Redis** | Swarm/K8s | Cache, filas, rate limit, pub/sub Realtime |

### Backend & dados

| Camada | Tecnologia | Papel |
|--------|------------|-------|
| Banco | **PostgreSQL** self-hosted | multi-tenant, RLS + `tenant_id` |
| Auth | **Keycloak** self-hosted (OIDC) | login, MFA, JWT, roles — configurar, não codificar |
| Arquivos | **MinIO** (via API presign) | fotos check-in |
| Realtime | SSE/WebSocket na API + Redis pub/sub | board de status |
| Cache/filas | Redis | rate limit, fila WhatsApp, idempotência webhooks |
| API | **Hono** (Docker) | REST `/v1/*` |
| Jobs | BullMQ + Redis | processamento assíncrono |
| Vetorial (opc.) | Qdrant — Fase 2+ | busca semântica/IA; **não substitui Postgres** |

### Auth — Keycloak (decisão Diego)

**Por que Keycloak:** referência enterprise (Red Hat), OIDC/OAuth2 padrão, self-hosted no Swarm, MFA e proteção brute-force nativos.

**Integração (bibliotecas, zero auth custom):**

| Cliente | Biblioteca |
|---------|------------|
| Web Next.js | Auth.js (`next-auth`) provider Keycloak **ou** `@react-keycloak/web` |
| Mobile Expo | `react-native-app-auth` (OAuth2 PKCE / AppAuth) |
| API Hono | `jose` — validação JWT via JWKS endpoint Keycloak |

**Multi-tenant no JWT:** User Attribute `tenant_id` + Protocol Mapper → claim no access token.

### Fluxo de request

```
Web/Mobile  →  Keycloak (login OIDC)  →  Bearer JWT
     ↓
  HTTPS  →  API (Hono)  →  SET LOCAL app.tenant_id  →  PostgreSQL (RLS)
                ↓
           Redis / MinIO / Chatwoot / Stripe
```

### Infra & evolução (Docker Swarm → K8s)

**Agora (self-hosted no Swarm):**
- **Web:** CDN / Vercel (frontend)
- **API + Worker + Keycloak + Postgres + Redis + MinIO:** Docker Swarm

**Evolução:**
- API e workers → K8s com HPA (escala horizontal independente do front)
- Front escala no CDN sem redeploy da API
- Mesmas imagens Docker Swarm → K8s

## Fases de entrega

### MVP (Fase 1) — validar operação
- [ ] Multi-tenant + auth
- [ ] RBAC básico (3 papéis fixos)
- [ ] Entrada veículo + tipos de lavagem
- [ ] Pipeline de status + board
- [ ] Cliente (nome, telefone, histórico)
- [ ] Pagamento manual
- [ ] Caixa simples (entradas/saídas do dia)

### Fase 2 — operação completa
- [ ] Fotos no check-in
- [ ] Despesas categorizadas
- [ ] Comissões por funcionário
- [ ] Alertas de insumos
- [ ] RBAC configurável pelo admin
- [ ] App mobile Expo (operação + status)

### Fase 3 — integrações
- [ ] Adapter Stripe
- [ ] Chatwoot WhatsApp
- [ ] Adapters BR (Mercado Pago, Stone, Cielo)
- [ ] Offline sync mobile

### Fase 4 — crescimento
- [ ] Programa fidelidade
- [ ] Analytics avançado + projeções
- [ ] LLM insights (opcional)
- [ ] Planos SaaS / billing da plataforma

## Épicos sugeridos (BMAD)

| Epic | Nome | Prioridade |
|------|------|------------|
| E1 | Fundação SaaS (tenant, Keycloak, Postgres RLS) | P0 |
| E2 | Operações & pipeline | P0 |
| E3 | Clientes & histórico | P0 |
| E4 | Catálogo de lavagens | P0 |
| E5 | Financeiro & caixa | P1 |
| E6 | Funcionários & RBAC avançado | P1 |
| E7 | Pagamentos (manual + adapters) | P1 |
| E8 | Mobile nativo (Expo) | P1 |
| E9 | WhatsApp / Chatwoot | P2 |
| E10 | Estoque / insumos | P2 |
| E11 | Fidelidade | P3 |
| E12 | Analytics & projeções | P2 |
| E13 | Billing SaaS (Stripe Billing) | P3 |

## Decisões pendentes (Diego)

1. **LLM em analytics:** Fase 1 sem LLM — confirma?
2. **Mobile:** Expo vs Capacitor?
3. **Monorepo:** migrar Next.js para `apps/web`?
4. ~~Supabase~~ — **decidido:** Postgres + Keycloak + MinIO self-hosted

## Open questions

- Placa de veículo: validação Mercosul + busca por placa existente?
- Múltiplas unidades/filiais por tenant no MVP?
- Impressão de comprovante / ticket na entrega?

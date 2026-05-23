---
title: Lava Rápido SaaS
status: final
created: 2026-05-21
updated: 2026-05-21
revision: 3
project: lava-rapido
inputs:
  - planning-artifacts/brief-addendum.md
  - planning-artifacts/architecture.md
  - planning-artifacts/brainstorming-session-2026-05-21-2330.md
  - project-context.md
---

# PRD: Lava Rápido SaaS

Plataforma multi-tenant para gestão operacional e financeira de lava-rápido automotivo.

## 0. Document Purpose

Este PRD define **o que** o Lava Rápido deve fazer para proprietários, gerentes e operadores de lava-rápido. Destina-se a PM, stakeholders e workflows downstream (UX, arquitetura, épicos).

**Inputs:** product brief addendum, sessão de brainstorming, architecture.md. Detalhes técnicos de implementação ficam em `addendum.md` e `architecture.md` — este documento descreve **capacidades e comportamentos**, não stack.

**Estrutura:** glossário → jornadas → features com FRs numerados (FR-1…) → NFRs transversais → escopo MVP.

---

## 1. Vision

Proprietários de lava-rápido perdem dinheiro e tempo com cadernos, planilhas e sistemas complexos demais para quem está na pista. O **Lava Rápido** é um SaaS que centraliza fila de veículos, clientes, caixa e equipe — com **poucos botões**, visual premium porém acolhedor, e funcionamento confiável mesmo quando a internet ou a maquininha falham.

Cada **Tenant** (conta do dono) pode ter **uma ou mais Filiais** (pontos físicos). O proprietário enxerga visão **unificada** e **por filial**; operadores trabalham no ponto onde estão. A plataforma escala para milhares de tenants sem exigir que o operador entenda tecnologia.

---

## 2. Target User

### 2.1 Primary Personas

**Proprietário (Admin)** — Dono do lava-rápido. Quer ver caixa, configurar preços e permissões, eventualmente de casa ou no fim do dia. Baixa tolerância a curva de aprendizado.

**Operador (Usuário)** — Funcionário na pista. Usa celular ou tablet com luvas, sol forte, fila no sábado. Precisa registrar carro e mudar status em segundos.

**Gerente** — Supervisiona operação e equipe. Acesso intermediário configurável pelo Admin.

### 2.2 Jobs To Be Done

- Registrar entrada de veículo sem erro de placa
- Saber em que etapa cada carro está ( **Pipeline de Status** )
- Registrar pagamento mesmo com maquininha desacoplada
- Consultar histórico do cliente pelo telefone
- Fechar caixa do dia com confiança (por filial e consolidado)
- Notificar cliente quando carro está pronto (WhatsApp — Fase 2)

### 2.3 Non-Users (v1)

- Cliente final do lava-rápido (não usa o app; pode receber WhatsApp no futuro)
- Contador externo com acesso direto (export manual LGPD — Fase 2)
- Franqueador de rede (marca white-label) — fora do escopo v1

### 2.4 Key User Journeys

**UJ-1. Operador registra um carro na fila do sábado**

- **Persona + contexto:** Carlos, operador, fila de 8 carros, 4G instável.
- **Entry state:** autenticado; contexto da **Filial** "Unidade Centro" selecionado; home = **Board de Status** dessa filial.
- **Path:** toca "+ Lavagem" → digita placa (validação Mercosul) → confirma placa → seleciona **Tipo de Lavagem** → informa **Cliente** → salva → imprime ticket → WhatsApp check-in se opt-in.
- **Climax:** card na coluna **Preparação**; cliente recebe comprovante e mensagem de entrada.
- **Resolution:** Carlos passa ao próximo carro sem navegar em menus.
- **Edge case:** placa similar existente — sistema sugere "Você quis dizer…?" antes de criar duplicata.

**UJ-2. Operador move carro pelo Pipeline de Status**

- **Persona + contexto:** Carlos, carro em lavagem.
- **Path:** no card do veículo, toca próximo status: Preparação → Lavando → Finalização → Pronto.
- **Climax:** card move para coluna **Pronto**; contador de fila atualiza.
- **Edge case:** sem rede — mudança fica na fila local e sincroniza ao reconectar `[Fase 2]`.

**UJ-3. Proprietário consulta caixa — visão unificada e por filial**

- **Persona + contexto:** Ana tem 3 pontos; quer ver o dia todo e comparar unidades.
- **Path:** aba "Caixa" → default **Consolidado** (soma das 3 filiais) → toca filial "Unidade Norte" → vê caixa só daquela unidade.
- **Climax:** entende faturamento total e de cada ponto sem planilha.

**UJ-4. Admin cadastra Tipo de Lavagem e preço**

- **Path:** Configurações → Tipos de lavagem → criar "Completa SUV" R$ 80.
- **Climax:** tipo disponível no fluxo de entrada (UJ-1).

**UJ-5. Admin cadastra nova Filial**

- **Path:** Configurações → Filiais → "Adicionar unidade" → nome + endereço → salvar.
- **Climax:** nova filial aparece no seletor de Ana e no contexto operacional.

---

## 3. Glossary

- **Tenant** — Conta SaaS do dono do negócio (1 assinatura). Agrupa Filiais, Clientes compartilhados e configurações.
- **Filial** — Um ponto físico de lavagem (endereço). Tenant pode ter **1 ou N** Filiais. Board, caixa e operação são **por Filial**.
- **Visão consolidada** — Agregação de métricas/caixa de todas as Filiais do Tenant.
- **Visão individual** — Dados filtrados a uma Filial específica.
- **Vehicle Entry** — Registro de atendimento em uma Filial: placa + Tipo de Lavagem + Cliente + Pipeline.
- **Pipeline de Status** — Etapas: **Preparação**, **Lavando**, **Finalização**, **Pronto**; **Cancelado** (terminal).
- **Tipo de Lavagem** — Serviço configurável com nome e preço (nível Tenant; válido em todas as Filiais no MVP).
- **Cliente** — Pessoa atendida; compartilhado no Tenant (histórico em qualquer Filial); atributos: nome, telefone, **WhatsApp opt-in**.
- **Board de Status** — Tela principal com colunas do Pipeline; home da operação.
- **Pagamento manual** — Registro de pagamento sem confirmação de gateway integrado.
- **Tenant isolation** — Dados de um Tenant inacessíveis a outro (requisito de plataforma).

---

## 4. Features

### 4.1 Autenticação e Tenant

**Description:** Usuários acessam via identidade corporativa da plataforma (IdP externo — ver addendum). Cada usuário pertence a um Tenant. Papéis: Admin, Gerente, Usuário.

**Functional Requirements:**

#### FR-1: Login multi-superfície

Usuário pode autenticar-se no web e mobile com credenciais gerenciadas pelo IdP da plataforma. Realiza UJ-1, UJ-3.

**Consequences (testable):**
- Sessão expirada redireciona para login sem perder contexto de rota após reauth.
- Token inclui identificador do Tenant, papel do usuário e **Filial(is) acessível(is)**.

#### FR-2: Isolamento de Tenant

Sistema garante que usuário do Tenant A não visualiza nem altera dados do Tenant B.

**Consequences (testable):**
- Teste automatizado falha se user A acessa recurso de Tenant B.
- Toda operação de dados associa registro ao Tenant do JWT.

#### FR-3: Papéis base RBAC

Admin, Gerente e Usuário têm permissões padrão diferenciadas (Admin: tudo; Gerente: operação + relatórios; Usuário: operação).

**Consequences (testable):**
- Usuário sem permissão recebe erro claro em português ao tentar ação restrita.

---

### 4.2 Operações — Entrada e Pipeline

**Description:** Core operacional. Board único minimalista; sem modos alternativos de UI. Realiza UJ-1, UJ-2.

**Functional Requirements:**

#### FR-4: Registrar Vehicle Entry

Operador pode criar Vehicle Entry informando placa (obrigatório), Tipo de Lavagem, Cliente (nome + telefone).

**Consequences (testable):**
- Placa é exibida para confirmação explícita antes de persistir.
- Vehicle Entry criado aparece no Board em **Preparação** em ≤3s com rede normal.

#### FR-5: Validar e confirmar placa (Mercosul ou antiga)

Sistema valida **dois formatos** e exige confirmação visual antes de persistir:

- **Mercosul:** ABC1D23 (3 letras + 1 número + 1 letra + 2 números)
- **Antiga:** ABC1234 (3 letras + 4 números)

**Consequences (testable):**
- Placa fora dos dois padrões exibe erro claro; operador pode corrigir antes de continuar.
- Não é possível salvar sem passar pela tela de confirmação (indica o formato detectado).
- Placas similares recentes disparam sugestão de revisão.

#### FR-6: Atualizar Pipeline de Status (avanço, retrocesso e cancelamento)

Operador autorizado pode mover Vehicle Entry entre etapas do Pipeline **para frente e para trás**, e pode **cancelar** um atendimento.

**Estados:** Preparação → Lavando → Finalização → Pronto; **Cancelado** (terminal, fora das colunas ativas).

**Consequences (testable):**
- Retrocesso permitido entre quaisquer etapas não terminais (ex.: Finalização → Lavando).
- Cancelamento disponível enquanto status ≠ Pronto; exige confirmação em um toque.
- Vehicle Entry cancelado sai do Board ativo e permanece no histórico com status Cancelado.
- Board reflete mudanças em tempo real para usuários do Tenant.

#### FR-7: Board de Status como home

Home autenticada do operador é o Board; contador de veículos na fila visível como badge.

**Consequences (testable):**
- Máximo 4 ações primárias visíveis na home operacional.
- Financeiro e configurações acessíveis apenas via navegação secundária ("Mais").

#### FR-8: Comprovante de check-in (impressão)

Após registrar Vehicle Entry, operador pode imprimir **ticket de check-in** com placa, Tipo de Lavagem, data/hora e identificador do atendimento.

**Consequences (testable):**
- Impressão via navegador (PDF/HTML print-friendly) no MVP; impressora térmica Bluetooth `[Fase 2]`.
- Ticket gerado em ≤3s após confirmação do registro.

#### FR-9: WhatsApp no check-in

Se Cliente tem **WhatsApp opt-in**, sistema envia mensagem automática de confirmação de entrada (placa, serviço, previsão `[ASSUMPTION]` opcional) via integração Chatwoot.

**Consequences (testable):**
- Sem opt-in, nenhuma mensagem é enviada.
- Envio assíncrono; falha de WhatsApp não bloqueia registro do Vehicle Entry.
- Mensagem de check-in distinta da mensagem "carro pronto" (FR-22).

#### FR-10: Fotos no check-in `[Fase 2 — fora MVP]`

Operador pode anexar fotos opcionais ao Vehicle Entry para registro de avaria.

---

### 4.3 Catálogo — Tipos de Lavagem

**Description:** Admin define serviços e preços. Realiza UJ-4.

#### FR-11: CRUD Tipo de Lavagem

Admin pode criar, editar, desativar Tipos de Lavagem com nome, preço e duração estimada opcional.

**Consequences (testable):**
- Tipo inativo não aparece no fluxo de entrada.
- Alteração de preço não altera retroativamente Vehicle Entries fechados.

---

### 4.4 Clientes

**Description:** Cadastro mínimo e histórico. Realiza UJ-1, UJ-3.

#### FR-12: Cadastrar Cliente

Operador pode cadastrar Cliente com nome e telefone; flag WhatsApp opt-in opcional.

**Consequences (testable):**
- Busca por telefone ou nome retorna resultados em ≤2s (até 10k clientes/tenant `[ASSUMPTION]`).

#### FR-13: Histórico de lavagens

Usuário autorizado pode ver histórico de Vehicle Entries por Cliente.

---

### 4.5 Financeiro e Pagamentos

**Description:** Caixa e pagamentos com integração opcional. Pagamento manual é first-class. Realiza UJ-3.

#### FR-14: Registrar pagamento manual

Operador pode marcar Vehicle Entry como pago informando forma (dinheiro, PIX externo, cartão maquininha desacoplada).

**Consequences (testable):**
- Fluxo operacional completa mesmo com integração de pagamento desabilitada no Tenant.
- Pagamento manual não exige gateway online.

#### FR-15: Caixa diário (MVP simplificado)

Proprietário/Gerente pode ver total de entradas do dia por lavagens concluídas e pagas.

**Consequences (testable):**
- Totais batem com soma de pagamentos registrados no dia (timezone do Tenant `[ASSUMPTION]` America/Sao_Paulo).

#### FR-16: Despesas `[Fase 2]`

Admin registra despesas categorizadas.

#### FR-17: Comissões por funcionário `[Fase 2]`

Admin configura comissão opcional por funcionário; sistema calcula no fechamento.

#### FR-18: Integração gateway `[Fase 3]`

Tenant habilitado pode conectar provedor (Stripe, Mercado Pago, Stone, Cielo); webhook confirma pagamento.

**Consequences (testable):**
- Webhooks duplicados não criam pagamento duplicado.
- Falha de gateway não impede pagamento manual (FR-14).

---

### 4.6 Funcionários e permissões avançadas

#### FR-19: Cadastro de funcionário

Admin cadastra funcionário vinculado a usuário IdP com papel e telefone.

#### FR-20: Matriz de permissões configurável `[Fase 2]`

Admin define por Tenant quais módulos e ações Gerente/Usuário podem acessar.

---

### 4.7 Estoque / Insumos `[Fase 2]`

#### FR-21: Alerta de insumo

Operador reporta produto acabando ou esgotado em um toque; Admin vê fila de reposição.

---

### 4.8 Comunicação WhatsApp `[Fase 3]`

#### FR-22: Notificar cliente pronto

Sistema envia mensagem via integração Chatwoot quando status = Pronto e Cliente tem WhatsApp opt-in.

**Consequences (testable):**
- Sem opt-in, nenhuma mensagem é enviada.
- Envio é assíncrono; falha de WhatsApp não bloqueia operação.

---

### 4.9 Analytics `[Fase 2+]`

#### FR-23: Relatórios operacionais

Proprietário vê faturamento por período, ticket médio, lavagens/dia via agregações SQL.

#### FR-24: Projeção simples

Sistema exibe projeção baseada em média móvel (sem LLM na Fase 1).

#### FR-25: Insights LLM `[Fase 4 — opcional]`

Narrativas em linguagem natural sobre tendências — requer decisão de produto separada.

---

### 4.10 Fidelidade `[Fase 4 — feature premium]`

#### FR-26: Programa de pontos

Tenant habilitado configura recompensas por visitas/pontos.

---

### 4.11 Multi-filial (1 ou N pontos por Tenant)

**Description:** Donos operam 1 ou mais pontos. Operadores veem uma Filial; Admin vê consolidado + drill-down. Realiza UJ-3, UJ-5.

#### FR-27: Cadastrar Filiais

Admin pode criar, editar e desativar Filiais (nome obrigatório; endereço opcional).

**Consequences (testable):**
- Tenant novo recebe 1 Filial default no onboarding.
- Filial inativa não aceita novos Vehicle Entries.

#### FR-28: Contexto operacional por Filial

Operador trabalha no contexto de **uma Filial**; Board e Vehicle Entries são scoped à Filial ativa.

**Consequences (testable):**
- Operador só vê/modifica entries da Filial atribuída.
- Seletor de Filial visível para Admin/Gerente com acesso a múltiplas unidades.

#### FR-29: Visão consolidada e individual (Admin)

Proprietário (Admin) alterna entre **Consolidado** (todas as Filiais) e **Filial específica** em Caixa e Board resumo.

**Consequences (testable):**
- Caixa consolidado = soma das Filiais no período selecionado.
- Drill-down em ≤2 toques para caixa de uma Filial.

#### FR-30: Cliente compartilhado entre Filiais

Cliente cadastrado no Tenant é visível em qualquer Filial; histórico lista lavagens de todas as Filiais com indicação da unidade.

---

## 5. Non-Goals (Explicit)

- **Modo Pista** ou qualquer UI alternativa automática por volume de fila
- Desenvolver autenticação própria (login/senha/hash)
- Dependência de Supabase ou BaaS managed para dados core
- Qdrant ou banco vetorial como store principal de negócio
- ERP contábil completo (folha, NF-e, estoque contábil)
- App para cliente final agendar lavagem (v1)
- LLM gerando números financeiros

---

## 6. MVP Scope

### 6.1 In Scope

- **Multi-filial:** 1+ Filiais por Tenant; visão consolidada + individual (FR-27–30)
- Tenant + auth IdP + RBAC base (Admin/Gerente/Usuário)
- Board de Status + Pipeline (avanço, **retrocesso** e **cancelamento**)
- Vehicle Entry com validação Mercosul + confirmação de placa
- Impressão ticket de check-in (FR-8)
- WhatsApp confirmação de check-in com opt-in (FR-9) + Chatwoot
- Tipos de Lavagem (CRUD Admin)
- **Filiais** (CRUD Admin; 1 default no onboarding)
- Clientes (nome, telefone, histórico básico)
- Pagamento manual + caixa diário simplificado
- Web responsivo; API preparada para mobile
- Tenant isolation + testes cross-tenant
- UI única minimalista (3–4 CTAs na home operacional)

### 6.2 Out of Scope for MVP

| Item | Fase | Motivo |
|------|------|--------|
| App mobile Expo | 2 | Web operacional primeiro |
| Fotos avaria | 2 | MinIO + presign |
| Offline sync | 2 | Complexidade sync |
| Despesas / comissões | 2 | Caixa MVP suficiente |
| RBAC configurável | 2 | 3 papéis fixos bastam |
| WhatsApp "carro pronto" | 2 | Check-in no MVP; pronto na Fase 2 |
| Gateways pagamento | 3 | Manual cobre maquininha desacoplada |
| Fidelidade | 4 | Feature premium |
| LLM analytics | 4 | SQL basta inicialmente |
| Preço por Filial (catálogo diferente) | 2 | Catálogo único Tenant no MVP |

---

## 7. Success Metrics

**Primary**

- **SM-1:** Time-to-register — operador registra Vehicle Entry em mediana ≤45s (UJ-1). Valida FR-4, FR-5, FR-7.
- **SM-2:** Zero incidentes cross-tenant em produção (30 dias pós-launch). Valida FR-2.
- **SM-3:** 80% dos tenants ativos completam ≥1 fechamento de caixa/semana no MVP+30d. Valida FR-15.

**Secondary**

- **SM-4:** NPS proprietário ≥40 após 60 dias (amostra tenants pagantes `[ASSUMPTION]`).
- **SM-5:** Taxa de erro de placa reportada <2% dos entries (via suporte ou flag admin). Valida FR-5.

**Counter-metrics (do not optimize)**

- **SM-C1:** Número de features/telas — evitar complexidade; UI deve permanecer minimalista.
- **SM-C2:** Tempo médio de sessão operador — sessões longas indicam UX confusa, não engajamento.

---

## 8. Cross-Cutting NFRs

### Performance

- Board atualiza status em ≤2s p95 para usuários no mesmo Tenant (rede 4G).
- API health/readiness para orquestração Swarm/K8s.

### Security & Privacy

- Tenant isolation (FR-2) com defesa em profundidade.
- LGPD: export de dados por Tenant `[Fase 2]`; retenção fotos 90 dias `[Fase 2]`.
- Secrets de gateway apenas server-side.

### Reliability

- Degraded mode: operação de status tolera IdP indisponível por JWT cache curto no mobile `[Fase 2]`; MVP web requer IdP online.
- Pagamento manual disponível independente de integrações.

### Observability

- Logs estruturados com `tenant_id`, `branch_id`, `request_id`.
- Métricas: requests/s, latência p95, jobs fila.

### Accessibility (operacional)

- Ícones + rótulo curto; contraste alto para uso ao sol `[Fase 2: modo sol manual]`.
- Touch targets ≥48px.

---

## 9. Aesthetic and Tone

- **Tom:** premium soft — confiante, refinado, acolhedor; **não** visual de planilha ou app genérico.
- **Paleta:** azul petróleo `#2B5F8C`, deep `#1A3D5C`, fundo gradient `#F7F9FB→#E8EEF4`, accent sage `#5BA88C`.
- **Tipografia:** Plus Jakarta Sans (UI) + DM Mono (placas).
- **Acabamento:** cards elevados, header gradiente + glass, colunas com ambient tint, motion spring sutil.
- **Operação:** continua simples (3–4 CTAs) — premium vem do **visual**, não de mais features.
- **Anti-patterns:** ERP denso, flat sem profundidade, ícones sem texto na operação, jargon em erros.

Detalhe visual: `planning-artifacts/ux-design-specification.md` + `ux-color-themes.html`.

---

## 10. Platform

| Superfície | MVP | Futuro |
|------------|-----|--------|
| Web | Sim (operacional + admin) | — |
| Mobile nativo | Não | Expo Fase 2 |
| API pública | REST interna web/mobile | — |

---

## 11. Monetization — **Modelo A confirmado**

**Assinatura fixa mensal por Tenant** (conta do dono).

| Aspecto | Regra |
|---------|-------|
| Cobrança | Valor mensal fixo R$ X por Tenant |
| Filiais | **Incluídas** na mesma assinatura (1 ou N pontos, mesma conta) |
| Lavagens | Ilimitadas na faixa do plano `[ASSUMPTION]` — sem metered billing no MVP |
| Trial | Período trial configurável pré-launch |
| Billing automático | Stripe Billing — Fase 4; MVP cobrança manual/boleto |

**Add-ons premium (Fase 4):** fidelidade, analytics avançado, integrações premium.

**Nota comercial:** preço R$ X a definir; modelo não cobra por filial adicional.

---

## 12. Risk Register (summary)

| Risco | Mitigação PRD |
|-------|---------------|
| Placa errada | FR-5 |
| Maquininha offline | FR-12 |
| Vazamento tenant | FR-2, SM-2 |
| UI complexa demais | FR-7, SM-C1, Non-Goals Modo Pista |
| WhatsApp spam/ban | FR-9, FR-22 opt-in; templates aprovados |

Detalhe completo: sessão brainstorming CHAOS-001–017.

---

## 13. Resolved Questions & Open Items

### Resolvidas (2026-05-21 — Diego)

| # | Decisão |
|---|---------|
| 1 | Pipeline permite **retrocesso** e **cancelamento** (status Cancelado terminal) |
| 3 | **Impressão ticket** no check-in (MVP browser print) + **WhatsApp check-in** com opt-in |
| 2 | **Multi-filial:** 1+ pontos; visão consolidada + individual (FR-27–30) |
| 5 | **Pricing:** modelo **A** — assinatura fixa mensal por Tenant, filiais incluídas |

### Abertas

| # | Item |
|---|------|
| — | Valor R$ X mensal (comercial) |
| — | Limite máximo de Filiais por plano `[ASSUMPTION]` ilimitado no MVP |

---

## 14. Assumptions Index

- `[CONFIRMED]` Retrocesso e cancelamento no Pipeline
- `[CONFIRMED]` Validação Mercosul + confirmação visual
- `[CONFIRMED]` Ticket check-in + WhatsApp check-in no MVP (opt-in)
- `[CONFIRMED]` Multi-filial: 1+ pontos; visão consolidada + individual
- `[CONFIRMED]` Pricing modelo A — mensal fixo por Tenant, filiais incluídas
- Timezone Tenant America/Sao_Paulo default

---

## 15. Downstream

| Workflow | Input deste PRD |
|----------|-----------------|
| `bmad-create-ux-design` | ✅ Concluído — `ux-design-specification.md` |
| `bmad-create-epics-and-stories` | ✅ `planning-artifacts/epics.md` — E1–E4, 35 stories |
| Implementação | `architecture.md` + `project-context.md` |

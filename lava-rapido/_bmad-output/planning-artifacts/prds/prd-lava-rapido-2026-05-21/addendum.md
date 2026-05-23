# PRD Addendum — Lava Rápido

Detalhes técnicos e de arquitetura referenciados pelo PRD. **Fonte de verdade técnica:** `planning-artifacts/architecture.md` e `project-context.md`.

## Stack (não duplicar no PRD)

- PostgreSQL self-hosted + RLS
- Keycloak OIDC
- Hono API + Drizzle
- Next.js web + Expo mobile (Fase 2)
- MinIO, Redis, BullMQ
- Docker Swarm → K8s

## Integrações por fase

| Fase | Integração |
|------|------------|
| MVP | Manual only |
| 3 | Stripe, Mercado Pago, Stone, Cielo, Chatwoot |

## Domínio multi-filial

- **Tenant** = conta do dono (1 assinatura modelo A)
- **Filial** = ponto físico; board/caixa operacionais são por filial
- Clientes compartilhados no Tenant; histórico indica filial de cada lavagem

## Brainstorming CHAOS → NFR

Ver `brainstorming/brainstorming-session-2026-05-21-2330.md` para riscos CHAOS-001–017. CHAOS-001 (Modo Pista) arquivado.

# Lava Rápido

SaaS multi-tenant para gestão de lava-rápido — board premium, multi-filial, caixa e operação **+ Lavagem**.

## Stack

| Camada | Tecnologia |
|--------|------------|
| Web | Next.js 16, shadcn/ui, Tailwind 4 |
| API | Hono, Drizzle, PostgreSQL |
| Infra local | Docker (Postgres 16, Redis 7) |
| Auth MVP | `DEV_AUTH` (demo) → Keycloak em produção |

## Deploy VPS

```bash
cp infra/deploy/.env.example infra/deploy/.env   # editar senhas + MinIO
./infra/deploy/deploy.sh
```

Guia completo: `infra/deploy/README.md`

## Validar o MVP (local)

### 1. Pré-requisitos

- Node.js 20+
- **Docker Desktop** em execução

### 2. Setup (uma vez)

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

Isso instala deps, sobe Postgres/Redis, aplica schema e popula dados demo.

**Manual (alternativa):**

```bash
npm install
cp .env.local.example .env.local
cp apps/api/.env.example apps/api/.env

docker compose -f infra/docker/docker-compose.yml up -d postgres redis

npm --workspace=@lava-rapido/api run db:push
npm --workspace=@lava-rapido/api run db:seed
```

### 3. Rodar

```bash
npm run dev
```

| URL | Descrição |
|-----|-----------|
| http://localhost:3012/login | Login demo |
| http://localhost:3012/board | Board Kanban (home) |
| http://localhost:3011/v1/health | API health |

**Login demo:**

- **Admin Demo** — todas as filiais + caixa consolidado
- **Operador Demo** — só Filial Centro

## Roteiro de validação

1. Login como **Admin Demo** → board com colunas Preparação → Pronto
2. Tocar **+ Lavagem** → placa `ABC1D23` → confirmar → tipo → cliente → salvar
3. Mover card entre colunas (Próximo / Voltar)
4. Trocar filial no header (Centro / Norte / Todas)
5. **Caixa** — total do dia; consolidado vs filial
6. **Mais → Filiais / Tipos / Clientes**
7. Imprimir ticket após nova lavagem

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Web (:3012) + API (:3011) |
| `npm run dev:web` | Só frontend |
| `npm run dev:api` | Só API |
| `npm run build` | Build produção web |
| `npm run test:api` | Testes API (Postgres) |

## Estrutura

```
apps/api/          API Hono REST
packages/shared/   Tipos, placa Mercosul, DEMO_IDS
packages/api-client/
src/               Next.js web (board, caixa, config)
infra/docker/      Postgres, Redis, Keycloak, MinIO
lava-rapido/_bmad-output/   PRD, UX, épicos
```

## Documentação

- `infra/deploy/README.md` — **deploy VPS (Portainer + Traefik + MinIO)**
- `lava-rapido/_bmad-output/project-context.md` — regras para dev
- `lava-rapido/_bmad-output/planning-artifacts/epics.md` — stories MVP
- `lava-rapido/_bmad-output/implementation-artifacts/IMPLEMENTATION-STATUS.md` — status

## Auth produção

MVP usa `DEV_AUTH=true` com tokens `dev-admin` / `dev-operator`. Para Keycloak: configure realm `lava-rapido`, defina `DEV_AUTH=false` e `JWT_SECRET` na API.

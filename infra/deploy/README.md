# Deploy na VPS — Portainer + Docker Hub (sem clone na VPS)

Stack autocontida: volumes automáticos, configs inline.  
**Imagens vêm do Docker Hub** — build/push no seu Mac ou CI.

## Fluxo resumido

```
Mac/CI  →  docker build + push  →  Docker Hub
Portainer  →  cola compose + env  →  pull + Deploy
```

**Não precisa** clonar repo na VPS.

---

## 1. Build e push (no seu Mac)

```bash
cd lavarapido
export DOCKERHUB_USER=stratostech   # default no script

# opcional: ajuste domínios antes do build do web
cp infra/deploy/.env.example infra/deploy/.env
nano infra/deploy/.env

./infra/deploy/push-dockerhub.sh
```

Anote as imagens geradas, ex.:

```
LAVA_API_IMAGE=stratostech/lava-rapido-api:latest
LAVA_WEB_IMAGE=stratostech/lava-rapido-web:latest
```

> O build do **web** embute `NEXT_PUBLIC_API_URL` na imagem. Se mudar o domínio da API, rebuild + push de novo.

---

## 2. Portainer (só na VPS)

1. **Stacks → Add stack → Swarm**
2. Nome: `lava-rapido`
3. **Web editor**: cole `docker-compose.swarm.yml`
4. **Environment variables**: cole `portainer.env.example` e edite:
   - `CHANGE_ME_*` (senhas + MinIO)
   - `LAVA_API_IMAGE` / `LAVA_WEB_IMAGE` (suas imagens no Docker Hub)
5. **Deploy**

### Registry privado

Se as imagens forem privadas, em **Registries** do Portainer adicione credenciais Docker Hub antes do deploy.

---

## Variáveis obrigatórias no Portainer

| Variável | Exemplo |
|----------|---------|
| `POSTGRES_PASSWORD` | senha forte |
| `KEYCLOAK_ADMIN_PASSWORD` | senha admin |
| `MINIO_ACCESS_KEY` | `MINIO_ROOT_USER` do MinIO |
| `MINIO_SECRET_KEY` | `MINIO_ROOT_PASSWORD` do MinIO |
| `LAVA_API_IMAGE` | `stratostech/lava-rapido-api:latest` |
| `LAVA_WEB_IMAGE` | `stratostech/lava-rapido-web:latest` |

---

## Validar

```bash
curl https://apilava.stratostech.com.br/v1/health
curl https://apilava.stratostech.com.br/v1/ready
```

Login demo (`DEV_AUTH=true`): `dev-admin` / `dev-operator`

---

## Atualizar versão

1. Mac: `./infra/deploy/push-dockerhub.sh` (ou tag `IMAGE_TAG=v0.2.0`)
2. Portainer: atualize `LAVA_*_IMAGE` se mudou a tag → **Update stack**
3. Ou force pull: **Services → lava-api → Update → Pull latest**

---

## Pós-deploy

```
RUN_DB_PUSH=false
RUN_DB_SEED=false
```

---

## Alternativa: build na VPS

Só se preferir não usar Docker Hub:

```bash
git clone ... && ./infra/deploy/build-images.sh
```

---

## Arquivos

| Arquivo | Onde roda |
|---------|-----------|
| `push-dockerhub.sh` | Mac/CI — build + push |
| `docker-compose.swarm.yml` | Portainer — colar |
| `portainer.env.example` | Portainer — variáveis |
| `build-images.sh` | VPS — build local (opcional) |

## Troubleshooting

| Problema | Solução |
|----------|---------|
| 0/1 replicas | Imagem errada ou pull negado — confira `LAVA_*_IMAGE` e registry |
| `No such image` | Tag não existe no Hub — rode push de novo |
| Web chama API errada | Rebuild web com `API_HOST` correto no `.env` |
| MinIO false | Credenciais ou rede `HMLStratosNetwork` |

# Deploy via Portainer + Git

## Configuração da stack (uma vez)

Portainer → **Stacks → Add stack**

| Campo | Valor |
|-------|--------|
| Name | `lava-rapido` |
| Build method | **Repository** |
| Repository URL | `https://github.com/diegosanchespereira1/lavarapido.git` |
| Repository reference | `main` |
| Compose path | `docker-compose.yml` |
| Environment variables | cole `portainer.env.example` e edite senhas |

Marque **Enable relative path volumes** desligado (não usamos bind mounts).

### Variáveis obrigatórias

Edite no Portainer (não commite senhas):

```
POSTGRES_PASSWORD=...
KEYCLOAK_ADMIN_PASSWORD=...
MINIO_ACCESS_KEY=...      # MINIO_ROOT_USER
MINIO_SECRET_KEY=...      # MINIO_ROOT_PASSWORD
JWT_SECRET=...            # opcional se DEV_AUTH=true
```

Imagens (Docker Hub):

```
LAVA_API_IMAGE=stratostech/lava-rapido-api:latest
LAVA_WEB_IMAGE=stratostech/lava-rapido-web:latest
```

---

## Repo privado (se voltar a ser private)

Portainer → **Settings → Credentials → Add credential**

- Type: **Git**
- Username: `diegosanchespereira1`
- Password: GitHub **Personal Access Token** (scope `repo`)

Na stack, em **Git authentication**, selecione essa credencial.

---

## Atualizar deploy (GitOps simples)

1. Mac: altere código → `./infra/deploy/push-dockerhub.sh` (novas imagens)
2. Git: commit + push na branch `main`
3. Portainer → stack `lava-rapido` → **Pull and redeploy** (ou **Update the stack**)

Se só mudou variáveis, edite **Environment variables** e **Update the stack** (sem push no Git).

---

## Compose path

Use sempre:

```
docker-compose.yml
```

(na raiz do repo — não use `infra/deploy/...`)

---

## Troubleshooting

| Erro | Solução |
|------|---------|
| `could not find ref main` | Repo privado sem PAT, ou branch errada → use `main` |
| 0/1 replicas api/web | Imagens não existem no Hub → rode `push-dockerhub.sh` |
| `defina POSTGRES_PASSWORD` | Variável vazia no Portainer |

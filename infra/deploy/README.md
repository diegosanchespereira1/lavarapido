# Deploy na VPS — 3 passos

## Pré-requisitos

- VPS com **Docker Swarm** ativo (`docker swarm init`)
- **Portainer** + **Traefik** (entrypoint `websecure`, resolver `letsencryptresolver`)
- **MinIO** na rede `HMLStratosNetwork` (serviço `minio`)
- DNS apontando para a VPS:
  - `lava.stratostech.com.br`
  - `apilava.stratostech.com.br`
  - `authlava.stratostech.com.br`

## Deploy (CLI na VPS)

```bash
git clone <seu-repo> lava-rapido
cd lava-rapido

cp infra/deploy/.env.example infra/deploy/.env
nano infra/deploy/.env   # senhas + MINIO_ACCESS_KEY + MINIO_SECRET_KEY

chmod +x infra/deploy/*.sh
./infra/deploy/deploy.sh
```

O script valida ambiente, cria volumes, builda imagens e sobe o stack `lava-rapido`.

## Deploy (Portainer)

1. Clone o repo na VPS (ou faça build das imagens e push para registry)
2. Na VPS, rode `./infra/deploy/build-images.sh infra/deploy/.env`
3. Portainer → **Stacks → Add stack**
4. Nome: `lava-rapido`
5. Cole `infra/deploy/docker-compose.swarm.yml`
6. **Environment variables**: cole o conteúdo de `infra/deploy/.env`
7. Deploy

> O compose usa paths relativos (`./postgres/`, `./keycloak/`). No Portainer, o stack precisa ser criado a partir do diretório `infra/deploy/` ou ajuste os paths.

## Validar

```bash
curl -s https://apilava.stratostech.com.br/v1/health
curl -s https://apilava.stratostech.com.br/v1/ready
```

Abra `https://lava.stratostech.com.br/login`.

### Login demo (DEV_AUTH=true)

| Perfil | Token |
|--------|-------|
| Admin | `dev-admin` |
| Operador | `dev-operator` |

### Keycloak (após DEV_AUTH=false)

Realm `lava-rapido` importado automaticamente. Usuários demo:

| User | Senha |
|------|-------|
| admin-demo | AdminDemo123! |
| operador-demo | OperadorDemo123! |

Edite redirect URIs em `infra/deploy/keycloak/lava-rapido-realm.json` se mudar `WEB_HOST`.

## Pós-deploy

No `.env`:

```
RUN_DB_PUSH=false
RUN_DB_SEED=false
DEV_AUTH=false
```

Redeploy:

```bash
./infra/deploy/update-stack.sh
```

## Arquivos

| Arquivo | Função |
|---------|--------|
| `deploy.sh` | Deploy completo (validar + volumes + build + stack) |
| `update-stack.sh` | Redeploy sem rebuild |
| `build-images.sh` | Build API + Web |
| `prepare-volumes.sh` | Volumes externos |
| `validate-env.sh` | Checagem pré-deploy |
| `docker-compose.swarm.yml` | Stack Swarm + Traefik |
| `.env.example` | Variáveis |
| `keycloak/lava-rapido-realm.json` | Realm import |
| `postgres/01-keycloak-db.sql` | DB Keycloak |

## Troubleshooting

```bash
docker stack services lava-rapido
docker service logs lava-rapido_lava-api --tail 100
docker service logs lava-rapido_lava-keycloak --tail 100
```

| Problema | Solução |
|----------|---------|
| `minio.responde: false` | Credenciais MinIO + serviço `minio` na mesma rede |
| 502 no Traefik | Label `traefik.docker.network=HMLStratosNetwork` |
| Keycloak não importa realm | Logs do serviço; realm só importa na 1ª subida |
| CORS | `CORS_ORIGIN=https://` + valor de `WEB_HOST` |

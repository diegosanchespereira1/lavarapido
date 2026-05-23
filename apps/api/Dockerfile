FROM node:22-alpine AS builder
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/

RUN npm ci

COPY apps/api apps/api
COPY packages/shared packages/shared
COPY packages/api-client packages/api-client
COPY tsconfig.json ./

RUN npm --workspace=@lava-rapido/api run build

FROM node:22-alpine AS release
WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
COPY packages/api-client/package.json packages/api-client/

RUN npm ci

COPY --from=builder /repo/apps/api/dist apps/api/dist
COPY apps/api/scripts apps/api/scripts
COPY apps/api/drizzle.config.ts apps/api/
COPY apps/api/src/db apps/api/src/db

WORKDIR /repo/apps/api
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

RUN chmod +x scripts/start-prod.sh

CMD ["./scripts/start-prod.sh"]

FROM node:22-alpine AS release
WORKDIR /repo

COPY . .

RUN npm ci \
  && npm --workspace=@lava-rapido/api run build

WORKDIR /repo/apps/api
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

RUN chmod +x scripts/start-prod.sh

CMD ["./scripts/start-prod.sh"]

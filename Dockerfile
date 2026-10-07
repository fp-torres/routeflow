# Imagem opcional para desenvolvimento/homologação. A produção na Hostinger
# Business Web Hosting NÃO usa Docker (veja docs/deployment.md).
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages ./packages
COPY apps ./apps
COPY prisma ./prisma
COPY scripts ./scripts
RUN npm ci
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app /app
RUN npm prune --omit=dev --workspaces --include-workspace-root || true
EXPOSE 3000
CMD ["sh", "-c", "node scripts/db.mjs deploy && node apps/api/dist/main.js"]

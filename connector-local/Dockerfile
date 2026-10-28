# Imagem do conector local (lê o Top Gerente na rede da empresa).
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

COPY connector-local/package.json ./
RUN npm install

COPY connector-local/ ./

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8787/health || exit 1
CMD ["npx", "tsx", "src/index.ts"]

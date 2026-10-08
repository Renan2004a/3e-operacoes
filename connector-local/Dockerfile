# Imagem do conector local (lê o Top Gerente na rede da empresa).
FROM node:22-alpine

WORKDIR /app
COPY connector-local/package.json ./
RUN npm install

COPY connector-local/ ./

EXPOSE 8787
CMD ["npx", "tsx", "src/index.ts"]

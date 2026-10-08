# Imagem do app Next.js para rodar on-premise (rede da empresa).
FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Dependências (usa o lockfile; inclui o workspace connector-local).
COPY package.json package-lock.json ./
COPY connector-local/package.json ./connector-local/package.json
RUN npm ci

# Código + Prisma + build.
COPY . .
# DATABASE_URL de build (substituída em runtime pelo compose).
ENV DATABASE_URL="mysql://build:build@127.0.0.1:3306/3e_operacoes"
RUN npx prisma generate && npm run build

EXPOSE 3000
# Aplica migrations e sobe o app (a variável DATABASE_URL vem do ambiente).
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

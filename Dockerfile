# Estágio 1: Build
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copia arquivos de dependências
COPY package*.json ./
RUN npm install

# Copia o resto do código
COPY . .

# Faz o build do Vite (gera a pasta /dist)
RUN npm run build

# Estágio 2: Runtime (Imagem final leve)
FROM node:22-bookworm-slim

WORKDIR /app

# Copia apenas o necessário do estágio de build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/server.ts ./server.ts
# Se o seu server.ts precisa de tsx para rodar:
COPY --from=builder /app/node_modules/.bin/tsx ./node_modules/.bin/tsx

# Variáveis de ambiente
ENV NODE_ENV=production

# Porta padrão do Express (ajuste se necessário)
EXPOSE 3000

# Comando para rodar (usando tsx conforme seu package.json)
CMD ["npx", "tsx", "server.ts"]

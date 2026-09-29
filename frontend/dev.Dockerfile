# syntax=docker/dockerfile:1
FROM node:lts

WORKDIR /app

COPY package.json package-lock.json ./

# Instalação direta das dependências sem autenticação de repositório privado
RUN npm ci --ignore-scripts

COPY . .

# postinstall (icon build, msw init) precisa do código completo, executamos após copiar
RUN npm run postinstall

EXPOSE 5173

# --host expõe o servidor de desenvolvimento fora do container; CHOKIDAR_USEPOLLING
# faz o watcher do Vite detetar alterações dos volumes mapeados
CMD ["sh", "-c", "npm run postinstall && npm run dev -- --host"]
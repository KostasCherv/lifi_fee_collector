FROM node:22-slim

ENV NODE_ENV=production

RUN mkdir -p /app
WORKDIR /app

COPY . .
RUN npm run build

ENTRYPOINT ["node", "dist/server.js"]
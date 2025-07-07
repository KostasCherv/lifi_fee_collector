FROM node:22-slim

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build && npm prune --production

# Expose port and start
EXPOSE 3000
CMD ["npm", "start"]
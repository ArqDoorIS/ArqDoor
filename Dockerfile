# Stage 1: Build
FROM node:22-alpine AS builder
WORKDIR /app

# Variaveis do build (o Vite embute no bundle). Variavel que nao estiver declarada aqui
# nao chega ao build, mesmo marcada como build variable no Coolify. Mesma lista do
# deploy-vps.yml. So vai chave publica: tudo aqui fica visivel no navegador.
ARG VITE_API_URL
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_PAGARME_PUBLIC_KEY
ARG VITE_SENTRY_DSN

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install && npm cache clean --force

# Copy source code
COPY . .

# Build application with environment variables
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_PAGARME_PUBLIC_KEY=$VITE_PAGARME_PUBLIC_KEY
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
# Chave secreta da Pagar.me no bundle seria publica para qualquer visitante: para o build.
RUN case "$VITE_PAGARME_PUBLIC_KEY" in \
      ""|pk_*) ;; \
      *) echo "VITE_PAGARME_PUBLIC_KEY precisa ser a chave publica (pk_...)." >&2; exit 1 ;; \
    esac
RUN npm run build

# Stage 2: Development
FROM node:22-alpine AS development
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install && npm cache clean --force

# Copy source
COPY . .

# Expose Vite dev server port
EXPOSE 5173

# Start dev server with host flag for Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# Stage 3: Production with Nginx
FROM nginx:alpine AS production

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

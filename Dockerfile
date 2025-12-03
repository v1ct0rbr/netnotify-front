FROM node:25-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build
RUN npm prune --production
RUN rm -rf src tsconfig.json tsconfig.node.json

FROM nginx:1.29.3-alpine AS runner
RUN rm /etc/nginx/conf.d/default.conf
COPY docker/nginx.conf /etc/nginx/conf.d/app.conf

COPY --from=builder /app/dist /usr/share/nginx/html
# Healthcheck simples
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

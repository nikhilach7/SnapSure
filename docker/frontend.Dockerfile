FROM node:22-alpine3.22 AS deps
WORKDIR /app
COPY frontend/package.json /app/package.json
COPY frontend/package-lock.json /app/package-lock.json
RUN npm ci

FROM node:22-alpine3.22 AS builder
WORKDIR /app
COPY --from=deps /app/node_modules /app/node_modules
COPY frontend /app
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine3.22 AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV BACKEND_URL=http://backend:8000

RUN apk --no-cache upgrade --available

COPY --from=builder /app /app

USER node

EXPOSE 3000

CMD ["npm", "run", "start"]

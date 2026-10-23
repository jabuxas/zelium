# Zelium — Backend (produção)
# Build: docker build -f backend/Dockerfile -t zelium-backend .
# (contexto = src/, para incluir src/db usado nas migrações)

FROM node:22-alpine AS build
WORKDIR /app
COPY backend/package.json backend/package-lock.json ./
RUN npm ci
COPY backend/tsconfig.json backend/tsconfig.build.json ./
COPY backend/src ./src
RUN npx tsc -p tsconfig.build.json

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY db ./db
RUN mkdir -p /app/uploads
EXPOSE 8000
CMD ["node", "dist/index.js"]

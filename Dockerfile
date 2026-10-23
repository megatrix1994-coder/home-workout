# Build stage: install every workspace, generate the Prisma client, and build both packages.
FROM node:22-bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/package.json
COPY server/package.json server/package.json
COPY server/prisma server/prisma
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage: the API serves the built client. The Prisma CLI and tsx stay installed
# so that `prisma migrate deploy` runs on start and the seed can run as a one-off command.
FROM node:22-bookworm-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
ENV PORT=8080
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules node_modules
COPY --from=build /app/client/dist client/dist
COPY --from=build /app/server/package.json server/package.json
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/prisma server/prisma
COPY --from=build /app/server/src server/src
COPY --from=build /app/server/scripts server/scripts
COPY --from=build /app/server/tsconfig.json server/tsconfig.json
USER node
EXPOSE 8080
WORKDIR /app/server
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/api/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

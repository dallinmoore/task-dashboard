# --- Build Stage ---
FROM node:22-slim AS builder
WORKDIR /app

# Enable corepack for modern package manager pinning
RUN corepack enable

# Prisma's query engine needs OpenSSL at build (generate) and run time.
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy manifest + Prisma schema first. The schema must be present before
# `npm ci`, because the `postinstall` script runs `prisma generate`.
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci

# Copy source and run compilation (generates ./build/server and ./build/client)
COPY . .
RUN npm run build

# --- Production Stage ---
FROM node:22-slim AS runner
WORKDIR /app

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3000

RUN corepack enable
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy built bundles and the Prisma schema/migrations from the builder stage.
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

# Install production deps. `prisma` is a runtime dependency (not devDep) so
# `prisma migrate deploy` and `prisma generate` are available in the container.
# The postinstall hook regenerates the client against this stage's node_modules.
RUN npm ci --omit=dev

# Expose the default port react-router-serve listens on
EXPOSE 3000

# On boot: apply any pending migrations to the database on the mounted volume,
# then start the React Router server. (See the "start" script in package.json.)
CMD ["npm", "run", "start"]

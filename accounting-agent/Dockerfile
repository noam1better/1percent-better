FROM node:20-slim

WORKDIR /app

# Build tools required by better-sqlite3 (native module compilation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first (layer cached unless package.json changes)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Compile TypeScript agent → dist/
RUN npx tsc --project tsconfig.server.json

# Build Next.js dashboard → .next/
RUN npm run build

# Create persistent directories; these are overlaid by host volume mounts at runtime
RUN mkdir -p inbox/processed inbox/duplicates output data logs tests/samples

EXPOSE 3001 3002

# Healthcheck against the agent's /health endpoint (reads WEBHOOK_PORT at runtime)
HEALTHCHECK --interval=30s --timeout=5s --start-period=45s --retries=3 \
  CMD node -e "const p=process.env.WEBHOOK_PORT||3001;require('http').get('http://localhost:'+p+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

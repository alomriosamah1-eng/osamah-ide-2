FROM oven/bun:1.3.14-debian

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl ca-certificates \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Osamah IDE uses pnpm; the vendored OpenCode source preserves its upstream Bun lockfile.
RUN npm install -g corepack@latest \
    && corepack enable \
    && corepack pnpm install \
    && bun --cwd third_party/opencode install --frozen-lockfile \
    && corepack pnpm run build

ENV NODE_ENV=production \
    OPENCODE_EMBEDDED_AUTOSTART=1 \
    OPENCODE_BUN_PATH=/usr/local/bin/bun

CMD ["node", "dist/index.js"]

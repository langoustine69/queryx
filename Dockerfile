FROM oven/bun:1
WORKDIR /app
COPY queryx/package.json queryx/bun.lockb ./
RUN bun install --frozen-lockfile
COPY queryx/. .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD curl -f http://localhost:3000/health || exit 1
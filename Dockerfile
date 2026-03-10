FROM oven/bun:1 AS base
WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
 CMD curl -f http://localhost:3000/health || exit 1
CMD ["bun", "run", "src/index.ts"]

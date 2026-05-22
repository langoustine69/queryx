FROM oven/bun:1 AS base

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD bun -e "const response = await fetch('http://localhost:3000/health'); if (!response.ok) process.exit(1)"

CMD ["bun", "run", "src/index.ts"]

# Myanify backend (Next.js) — VPS image.
# Full install + `next start`. No standalone output needed.
FROM node:22-bookworm-slim

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Deps first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile

# Build-time vars: DATABASE_URL is read during static prerender,
# NEXT_PUBLIC_* is inlined into the client bundle.
ARG DATABASE_URL
ARG NEXT_PUBLIC_APP_URL
ENV DATABASE_URL=$DATABASE_URL NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL

COPY . .
RUN pnpm build

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]

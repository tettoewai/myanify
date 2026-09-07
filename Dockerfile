# Myanify backend (Next.js) — VPS image.
# Full install + `next start`. No standalone output needed.
FROM node:22-bookworm-slim

RUN apt-get update \
	&& apt-get install -y --no-install-recommends openssl \
	&& rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

WORKDIR /app

# Deps first for layer caching
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN pnpm install --frozen-lockfile


# Prisma config requires DATABASE_URL while generating the client. This dummy
# URL is only for the build; the real URL is supplied through the runtime .env.
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build?sslmode=disable
# NEXT_PUBLIC_* is inlined into the client bundle.
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NODE_OPTIONS=--max-old-space-size=1536

COPY . .
RUN DATABASE_URL="$DATABASE_URL" pnpm build

ENV NODE_ENV=production HOSTNAME=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["pnpm", "start"]

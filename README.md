# Myanify

Myanify is a music streaming platform for Myanmar music. Stream songs with synchronized lyrics, discover artists and albums, build playlists, and manage content through an admin dashboard.

## Features

- **Listener app** — Browse, search, and play Myanmar music with real-time synced lyrics
- **Playlists & library** — Create playlists, like songs, and track listening history
- **Search** — Full-text search powered by Typesense
- **Admin dashboard** — Manage songs, artists, albums, genres, ads, and subscription plans
- **Authentication** — Email/password and Google sign-in via NextAuth
- **Premium & VIP** — Subscription and payment flows (mobile app integration)

## Tech Stack

- [Next.js](https://nextjs.org/) 16 (App Router)
- [React](https://react.dev/) 19
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [NextAuth.js](https://authjs.dev/) v5
- [Typesense](https://typesense.org/) for search
- [Cloudinary](https://cloudinary.com/) for media uploads
- [Upstash Redis](https://upstash.com/) for caching and rate limiting
- [Tailwind CSS](https://tailwindcss.com/) 4

## Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/)
- PostgreSQL database
- Typesense instance (for search)
- Cloudinary account (for uploads)

## Getting Started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/myanify?schema=public"

# Auth
AUTH_SECRET="your-secret-key"
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# Cloudinary
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""

# Typesense
TYPESENSE_HOST="localhost"
TYPESENSE_PORT="8108"
TYPESENSE_PROTOCOL="http"
TYPESENSE_ADMIN_API_KEY=""
TYPESENSE_SEARCH_API_KEY=""

# Optional
UPSTASH_REDIS_REST_URL=""
UPSTASH_REDIS_REST_TOKEN=""
ENCRYPTION_MASTER_KEY=""
```

### 3. Set up the database

```bash
pnpm db:generate
pnpm db:push
pnpm db:seed
```

See [prisma/README.md](prisma/README.md) for detailed database setup, schema overview, and troubleshooting.

### 4. Sync search index

```bash
pnpm typesense:sync
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Generate Prisma client and build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:push` | Push schema to database (dev) |
| `pnpm db:migrate` | Run database migrations |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed database with sample data |
| `pnpm typesense:sync` | Sync search index to Typesense |

## Project Structure

```
app/
  (listener)/     # Listener-facing pages (home, search, library, player)
  admin/          # Admin dashboard
  api/            # API routes
components/       # Shared UI and player components
lib/              # Utilities, auth, search, and media helpers
prisma/           # Database schema, migrations, and seed data
```

## License

MIT — see [LICENSE](LICENSE).

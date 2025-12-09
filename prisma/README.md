# Database Setup Guide

This guide will help you set up the Prisma database for the Myanify music streaming platform.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (local or cloud)
- pnpm package manager

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Set Up Database Connection

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/myanify?schema=public"
```

**For different environments:**

- **Local Development:**
  ```env
  DATABASE_URL="postgresql://postgres:postgres@localhost:5432/myanify_dev"
  ```

- **Production (with connection pooling):**
  ```env
  DATABASE_URL="postgresql://user:password@host:5432/db?pgbouncer=true&connection_limit=1"
  ```

### 3. Generate Prisma Client

```bash
pnpm db:generate
```

### 4. Push Schema to Database

For development (quick sync without migrations):
```bash
pnpm db:push
```

For production (with migrations):
```bash
pnpm db:migrate
```

### 5. Seed the Database

```bash
pnpm db:seed
```

This will create:
- Admin user (admin@myanify.com)
- Sample listener user
- Genres, Artists, Albums, Songs
- Sample playlists and ads

### 6. Open Prisma Studio (Optional)

Visual database browser:
```bash
pnpm db:studio
```

## Database Schema Overview

### Core Models

- **User** - Admin and Listener accounts
- **Artist** - Music artists
- **Album** - Music albums
- **Song** - Individual tracks with lyrics
- **Genre** - Music genres
- **Playlist** - User-created playlists
- **LyricLine** - Synchronized lyrics for songs

### Feature Models

- **LikedSong** - User song favorites
- **PlayHistory** - Listening history
- **PremiumSubscription** - Premium membership
- **Ad** - Sponsored content
- **Upload** - File upload tracking

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm db:generate` | Generate Prisma Client |
| `pnpm db:push` | Push schema changes (dev) |
| `pnpm db:migrate` | Create and apply migrations (prod) |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:seed` | Seed database with sample data |

## Database Models for Admin App

Admins can manage:

1. **Songs**
   - Upload audio files
   - Add album cover images
   - Add synchronized lyrics
   - Set premium status
   - Publish/unpublish songs

2. **Artists**
   - Create artist profiles
   - Upload artist images
   - Add bio and genres

3. **Albums**
   - Create albums
   - Upload album covers
   - Set release dates

4. **Genres**
   - Create and manage genres
   - Add genre descriptions

5. **Ads**
   - Create sponsored content
   - Track impressions and clicks
   - Set active periods

## Database Models for Listener App

Listeners can:

1. **Play Music**
   - Browse published songs
   - View synchronized lyrics
   - Access premium content (if subscribed)

2. **Create Playlists**
   - Create public/private playlists
   - Add songs to playlists

3. **Interact**
   - Like songs
   - View play history
   - Manage premium subscription

## User Roles

- **ADMIN** - Full access to manage content
- **LISTENER** - Standard user access

## Next Steps

1. Set up authentication (NextAuth.js recommended)
2. Implement file upload for admin app
3. Connect API routes to Prisma Client
4. Set up database backups
5. Configure connection pooling for production

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Ensure database exists
4. Verify user permissions

### Migration Issues

If migrations fail:
```bash
# Reset database (WARNING: deletes all data)
pnpm prisma migrate reset

# Then re-run migrations
pnpm db:migrate
```

## Production Considerations

1. **Connection Pooling**: Use PgBouncer or Prisma Data Proxy
2. **Backups**: Set up automated database backups
3. **Indexes**: Schema includes optimized indexes
4. **Migrations**: Always use migrations in production
5. **Environment Variables**: Never commit `.env` files

## Support

For Prisma documentation: https://www.prisma.io/docs

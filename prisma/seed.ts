import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { prisma } from "../db";

async function resetDatabase() {
  console.log("🔄 Resetting database...");

  // Delete in order to respect foreign key constraints
  // Delete child records first
  await prisma.playlistSong.deleteMany();
  await prisma.likedSong.deleteMany();
  await prisma.playHistory.deleteMany();
  await prisma.lyricLine.deleteMany();
  await prisma.artistGenre.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.premiumSubscription.deleteMany();

  // Delete Auth.js related records
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();

  // Delete parent records
  await prisma.playlist.deleteMany();
  await prisma.song.deleteMany();
  await prisma.album.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database reset completed");
}

async function main() {
  console.log("🌱 Starting database seed...");

  // Reset database before seeding
  await resetDatabase();

  // Create Admin User
  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@myanify.com" },
    update: {},
    create: {
      email: "admin@myanify.com",
      name: "Admin User",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isPremium: true,
    },
  });
  console.log("✅ Created admin user:", admin.email);

  // Create Sample Listener User
  const listenerPasswordHash = await bcrypt.hash("listener123", 10);
  const listener = await prisma.user.upsert({
    where: { email: "listener@myanify.com" },
    update: {},
    create: {
      email: "listener@myanify.com",
      name: "Sample Listener",
      passwordHash: listenerPasswordHash,
      role: UserRole.LISTENER,
      isPremium: false,
    },
  });
  console.log("✅ Created listener user:", listener.email);

  // Create Genres
  const genres = await Promise.all([
    prisma.genre.upsert({
      where: { name: "Pop" },
      update: {},
      create: {
        name: "Pop",
        description: "Contemporary Myanmar pop music",
      },
    }),
    prisma.genre.upsert({
      where: { name: "Traditional" },
      update: {},
      create: {
        name: "Traditional",
        description: "Classic Myanmar traditional music",
      },
    }),
    prisma.genre.upsert({
      where: { name: "Rock" },
      update: {},
      create: {
        name: "Rock",
        description: "Myanmar rock and alternative",
      },
    }),
    prisma.genre.upsert({
      where: { name: "Folk" },
      update: {},
      create: {
        name: "Folk",
        description: "Regional folk songs of Myanmar",
      },
    }),
    prisma.genre.upsert({
      where: { name: "Hip Hop" },
      update: {},
      create: {
        name: "Hip Hop",
        description: "Myanmar hip hop and rap",
      },
    }),
    prisma.genre.upsert({
      where: { name: "Ballad" },
      update: {},
      create: {
        name: "Ballad",
        description: "Emotional love songs",
      },
    }),
  ]);
  console.log("✅ Created genres:", genres.length);

  // Create Artists
  const artists = await Promise.all([
    prisma.artist.create({
      data: {
        name: "Sai Sai Kham Leng",
        bio: "One of Myanmar's most beloved pop artists, known for emotional ballads and contemporary hits.",
        monthlyListeners: 1250000,
        artistGenres: {
          create: [
            { genreId: genres.find((g) => g.name === "Pop")!.id },
            { genreId: genres.find((g) => g.name === "Ballad")!.id },
          ],
        },
      },
    }),
    prisma.artist.create({
      data: {
        name: "Phyu Phyu Kyaw Thein",
        bio: "Legendary Myanmar vocalist celebrated for traditional and patriotic songs.",
        monthlyListeners: 890000,
        artistGenres: {
          create: [
            { genreId: genres.find((g) => g.name === "Traditional")!.id },
            { genreId: genres.find((g) => g.name === "Folk")!.id },
          ],
        },
      },
    }),
    prisma.artist.create({
      data: {
        name: "Hlwan Paing",
        bio: "Rock icon known for powerful vocals and energetic performances.",
        monthlyListeners: 720000,
        artistGenres: {
          create: [
            { genreId: genres.find((g) => g.name === "Rock")!.id },
            { genreId: genres.find((g) => g.name === "Pop")!.id },
          ],
        },
      },
    }),
  ]);
  console.log("✅ Created artists:", artists.length);

  // Create Albums
  const albums = await Promise.all([
    prisma.album.create({
      data: {
        name: "Love Songs Collection",
        description: "A collection of romantic Myanmar songs",
      },
    }),
    prisma.album.create({
      data: {
        name: "Homeland",
        description: "Songs celebrating Myanmar",
      },
    }),
  ]);
  console.log("✅ Created albums:", albums.length);

  // Create Sample Ad
  const ad = await prisma.ad.create({
    data: {
      title: "Experience Bagan",
      description: "Discover the ancient temples of Myanmar",
      linkUrl: "#",
      sponsor: "Myanmar Tourism",
      isActive: true,
    },
  });
  console.log("✅ Created ad:", ad.title);

  console.log("🎉 Database seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

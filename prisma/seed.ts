import { UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import "dotenv/config";
import { prisma } from "../db";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "item"
  );
}

async function resetDatabase() {
  console.log("🔄 Resetting database...");

  await prisma.playlistSong.deleteMany();
  await prisma.likedSong.deleteMany();
  await prisma.likedArtist.deleteMany();
  await prisma.playHistory.deleteMany();
  await prisma.offlineDownload.deleteMany();
  await prisma.deviceLicense.deleteMany();
  await prisma.paymentRequest.deleteMany();
  await prisma.lyrics.deleteMany();
  await prisma.songArtist.deleteMany();
  await prisma.artistGenre.deleteMany();
  await prisma.upload.deleteMany();
  await prisma.premiumSubscription.deleteMany();
  await prisma.paymentMethod.deleteMany();

  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();

  await prisma.playlist.deleteMany();
  await prisma.song.deleteMany();
  await prisma.album.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.genre.deleteMany();
  await prisma.ad.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.seoMetadata.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database reset completed");
}

async function main() {
  console.log("🌱 Starting database seed...");

  await resetDatabase();

  const adminPasswordHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      email: "admin@myanify.com",
      name: "Admin User",
      passwordHash: adminPasswordHash,
      role: UserRole.ADMIN,
      isPremium: true,
    },
  });
  console.log("✅ Created admin user:", admin.email);

  const listenerPasswordHash = await bcrypt.hash("listener123", 10);
  const listener = await prisma.user.create({
    data: {
      email: "listener@myanify.com",
      name: "Sample Listener",
      passwordHash: listenerPasswordHash,
      role: UserRole.LISTENER,
      isPremium: false,
    },
  });
  console.log("✅ Created listener user:", listener.email);

  const genreNames = [
    ["Pop", "Contemporary Myanmar pop music"],
    ["Traditional", "Classic Myanmar traditional music"],
    ["Rock", "Myanmar rock and alternative"],
    ["Folk", "Regional folk songs of Myanmar"],
    ["Hip Hop", "Myanmar hip hop and rap"],
    ["Ballad", "Emotional love songs"],
  ] as const;

  const genres = await Promise.all(
    genreNames.map(([name, description]) =>
      prisma.genre.create({
        data: {
          name,
          slug: slugify(name),
          description,
        },
      }),
    ),
  );
  console.log("✅ Created genres:", genres.length);

  const artists = await Promise.all([
    prisma.artist.create({
      data: {
        name: "Sai Sai Kham Leng",
        slug: slugify("Sai Sai Kham Leng"),
        aliases: [],
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
        slug: slugify("Phyu Phyu Kyaw Thein"),
        aliases: [],
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
        slug: slugify("Hlwan Paing"),
        aliases: [],
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

  const albums = await Promise.all([
    prisma.album.create({
      data: {
        name: "Love Songs Collection",
        slug: slugify("Love Songs Collection"),
        type: "ALBUM",
        description: "A collection of romantic Myanmar songs",
      },
    }),
    prisma.album.create({
      data: {
        name: "Homeland",
        slug: slugify("Homeland"),
        type: "EP",
        description: "Songs celebrating Myanmar",
      },
    }),
  ]);
  console.log("✅ Created albums:", albums.length);

  const sampleAudioUrl =
    "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

  const songs = await Promise.all([
    prisma.song.create({
      data: {
        title: "Cherish Every Moment",
        slug: slugify("Cherish Every Moment"),
        alternativeTitles: [],
        duration: 348,
        audioUrl: sampleAudioUrl,
        isPublished: true,
        albumId: albums[0].id,
        genreId: genres.find((g) => g.name === "Ballad")!.id,
        artists: {
          create: [{ artistId: artists[0].id }],
        },
        lyrics: {
          create: {
            language: "my",
            lines: [
              { order: 0, time: 0, text: "Sample lyric line one" },
              { order: 1, time: 12, text: "Sample lyric line two" },
              { order: 2, time: 24, text: "Sample lyric line three" },
            ],
          },
        },
      },
    }),
    prisma.song.create({
      data: {
        title: "Heart of the Nation",
        slug: slugify("Heart of the Nation"),
        alternativeTitles: [],
        duration: 312,
        audioUrl: sampleAudioUrl,
        isPublished: true,
        albumId: albums[1].id,
        genreId: genres.find((g) => g.name === "Traditional")!.id,
        artists: {
          create: [{ artistId: artists[1].id }],
        },
        lyrics: {
          create: {
            language: "my",
            lines: [
              { order: 0, time: 0, text: "Traditional sample lyric one" },
              { order: 1, time: 15, text: "Traditional sample lyric two" },
            ],
          },
        },
      },
    }),
    prisma.song.create({
      data: {
        title: "Electric Skyline",
        slug: slugify("Electric Skyline"),
        alternativeTitles: [],
        duration: 285,
        audioUrl: sampleAudioUrl,
        isPublished: true,
        albumId: albums[1].id,
        genreId: genres.find((g) => g.name === "Rock")!.id,
        artists: {
          create: [{ artistId: artists[2].id }],
        },
      },
    }),
  ]);
  console.log("✅ Created songs:", songs.length);

  const playlist = await prisma.playlist.create({
    data: {
      name: "My Favorites",
      slug: slugify("My Favorites"),
      description: "A starter playlist for testing",
      createdById: listener.id,
      isPublic: true,
      songs: {
        create: songs.map((song, index) => ({
          songId: song.id,
          order: index,
        })),
      },
    },
  });
  console.log("✅ Created playlist:", playlist.name);

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
  console.log("");
  console.log("Login credentials:");
  console.log("  Admin:    admin@myanify.com / admin123");
  console.log("  Listener: listener@myanify.com / listener123");
}

main()
  .catch((e) => {
    console.error("❌ Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

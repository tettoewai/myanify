import "dotenv/config";
import { prisma } from "../db";
import { getAdminClient } from "../lib/typesense/client";
import { collections } from "../lib/typesense/schemas";

const adminClient = getAdminClient();

async function createCollections() {
  for (const schema of collections) {
    try {
      await adminClient.collections(schema.name).delete();
    } catch (e) {
      /* ignore if not exists */
    }
    await adminClient.collections().create(schema);
    console.log(`✅ Created collection: ${schema.name}`);
  }
}

async function importDocuments(
  collection: string,
  documents: Record<string, unknown>[],
) {
  if (documents.length === 0) {
    console.log(`⏭️  Skipped ${collection}: no documents`);
    return;
  }

  await adminClient
    .collections(collection)
    .documents()
    .import(documents, { action: "upsert" });
  console.log(`✅ Indexed ${documents.length} ${collection}`);
}

// ---------- Songs ----------
async function indexSongs() {
  const songs = await prisma.song.findMany({
    include: {
      artists: { include: { artist: true } },
      album: true,
      genre: true,
    },
    where: { isPublished: true },
  });

  const documents = songs.map((song) => ({
    id: song.id,
    title: song.title,
    englishTitle: song.englishTitle || "",
    artistNames: song.artists.map((a) => a.artist.name),
    albumTitle: song.album?.name || "",
    albumId: song.albumId || "",
    genreNames: song.genre ? [song.genre.name] : [],
    duration: song.duration,
    releaseDate: song.releaseDate ? new Date(song.releaseDate).getTime() : 0,
    isPremium: song.isPremium,
    isPublished: song.isPublished,
    playCount: song.playCount,
    language: song.language || "my",
  }));

  await importDocuments("songs", documents);
}

// ---------- Artists ----------
async function indexArtists() {
  const artists = await prisma.artist.findMany({
    include: {
      artistGenres: { include: { genre: true } },
    },
  });

  const documents = artists.map((artist) => ({
    id: artist.id,
    name: artist.name,
    englishName: artist.englishName || "",
    slug: artist.slug,
    genreNames: artist.artistGenres.map((ag) => ag.genre.name),
    monthlyListeners: artist.monthlyListeners,
    country: artist.country || "",
  }));

  await importDocuments("artists", documents);
}

// ---------- Albums ----------
async function indexAlbums() {
  const albums = await prisma.album.findMany({
    include: {
      songs: { include: { artists: { include: { artist: true } } } },
    },
  });

  const documents = albums.map((album) => {
    // Collect unique artist names from all songs in the album
    const artistNamesSet = new Set<string>();
    album.songs.forEach((song) => {
      song.artists.forEach((songArtist) =>
        artistNamesSet.add(songArtist.artist.name),
      );
    });
    return {
      id: album.id,
      title: album.name,
      englishName: album.englishName || "",
      artistNames: Array.from(artistNamesSet),
      releaseDate: album.releaseDate
        ? new Date(album.releaseDate).getTime()
        : 0,
      albumType: album.type,
    };
  });

  await importDocuments("albums", documents);
}

// ---------- Genres ----------
async function indexGenres() {
  const genres = await prisma.genre.findMany();

  const documents = genres.map((genre) => ({
    id: genre.id,
    name: genre.name,
    englishName: genre.englishName || "",
    slug: genre.slug,
    description: genre.description || "",
  }));

  await importDocuments("genres", documents);
}

// ---------- Playlists ----------
async function indexPlaylists() {
  const playlists = await prisma.playlist.findMany({
    where: { isPublic: true },
    include: { createdBy: true },
  });

  const documents = playlists.map((playlist) => ({
    id: playlist.id,
    name: playlist.name,
    englishName: playlist.englishName || "",
    slug: playlist.slug,
    description: playlist.description || "",
    isPublic: playlist.isPublic,
    createdBy: playlist.createdById,
    createdAt: playlist.createdAt.getTime(),
  }));

  await importDocuments("playlists", documents);
}

async function main() {
  console.log("🔄 Syncing Typesense...");
  await createCollections();
  await indexSongs();
  await indexArtists();
  await indexAlbums();
  await indexGenres();
  await indexPlaylists();
  console.log("✅ Full sync complete");
  await prisma.$disconnect();
}

main().catch(console.error);

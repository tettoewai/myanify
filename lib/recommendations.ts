import { prisma, withRetry } from "@/db";
import { buildSongInclude } from "@/lib/song-query";
import { SONG_MOODS, normalizeMood, normalizeTags } from "@/lib/song-meta";

export { SONG_MOODS, normalizeMood, normalizeTags };
export type { SongMood } from "@/lib/song-meta";

/**
 * Recommendation engine for Myanify.
 *
 * Designed for a SMALL catalog first (content-based + personal taste profile),
 * no ML infra required. Scales later to collaborative / embeddings by swapping
 * the scoring function — API shapes stay stable.
 *
 * Signals (in priority order):
 *  1. Song type: genre, mood, tags, language, album type context
 *  2. Personalization: play history (time-decayed), liked songs (strong),
 *     liked artists, playlist adds
 *  3. Popularity + freshness (cold start / exploration)
 */

export type TasteProfile = {
  hasSignal: boolean;
  totalWeight: number;
  genreWeights: Record<string, number>;
  artistWeights: Record<string, number>;
  moodWeights: Record<string, number>;
  tagWeights: Record<string, number>;
  languageWeights: Record<string, number>;
  topGenres: { id: string; name: string; weight: number }[];
  topArtists: { id: string; name: string; weight: number }[];
  topMoods: { mood: string; weight: number }[];
  recentSongIds: string[];
  likedSongIds: string[];
};

const EMPTY_PROFILE: TasteProfile = {
  hasSignal: false,
  totalWeight: 0,
  genreWeights: {},
  artistWeights: {},
  moodWeights: {},
  tagWeights: {},
  languageWeights: {},
  topGenres: [],
  topArtists: [],
  topMoods: [],
  recentSongIds: [],
  likedSongIds: [],
};

function decayForPlayedAt(playedAt: Date): number {
  const days = (Date.now() - playedAt.getTime()) / 86_400_000;
  if (days < 7) return 1;
  if (days < 30) return 0.6;
  if (days < 90) return 0.35;
  return 0.2;
}

function topEntries(
  weights: Record<string, number>,
  names: Map<string, string>,
  take: number,
  key: "id" | "mood" = "id",
): any[] {
  return Object.entries(weights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, take)
    .map(([id, weight]) =>
      key === "mood"
        ? { mood: id, weight }
        : { id, name: names.get(id) ?? id, weight },
    );
}

/** Build a normalized taste profile from all available user signals. */
export async function getUserTasteProfile(
  userId: string | null | undefined,
): Promise<TasteProfile> {
  if (!userId) return EMPTY_PROFILE;

  return withRetry(async () => {
    const [history, likedSongs, likedArtists, playlistAdds] = await Promise.all([
      prisma.playHistory.findMany({
        where: { userId },
        include: {
          song: {
            select: {
              id: true,
              genreId: true,
              mood: true,
              tags: true,
              language: true,
              artists: { select: { artistId: true } },
              genre: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { playedAt: "desc" },
        take: 150,
      }),
      prisma.likedSong.findMany({
        where: { userId },
        include: {
          song: {
            select: {
              id: true,
              genreId: true,
              mood: true,
              tags: true,
              language: true,
              artists: { select: { artistId: true } },
              genre: { select: { id: true, name: true } },
            },
          },
        },
        take: 200,
      }),
      prisma.likedArtist.findMany({
        where: { userId },
        include: { artist: { select: { id: true, name: true } } },
        take: 100,
      }),
      prisma.playlistSong.findMany({
        where: { playlist: { createdById: userId } },
        include: {
          song: {
            select: {
              id: true,
              genreId: true,
              mood: true,
              tags: true,
              language: true,
              artists: { select: { artistId: true } },
              genre: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { addedAt: "desc" },
        take: 200,
      }),
    ]);

    const genreWeights: Record<string, number> = {};
    const artistWeights: Record<string, number> = {};
    const moodWeights: Record<string, number> = {};
    const tagWeights: Record<string, number> = {};
    const languageWeights: Record<string, number> = {};
    const genreNames = new Map<string, string>();
    const artistNames = new Map<string, string>();
    let totalWeight = 0;

    const addSong = (
      s: {
        genreId?: string | null;
        mood?: string | null;
        tags?: string[];
        language?: string | null;
        artists?: { artistId: string }[];
        genre?: { id: string; name: string } | null;
      } | null,
      w: number,
    ) => {
      if (!s || w <= 0) return;
      totalWeight += w;
      if (s.genreId) {
        genreWeights[s.genreId] = (genreWeights[s.genreId] ?? 0) + w;
        if (s.genre) genreNames.set(s.genreId, s.genre.name);
      }
      for (const a of s.artists ?? []) {
        artistWeights[a.artistId] = (artistWeights[a.artistId] ?? 0) + w;
      }
      if (s.mood) moodWeights[s.mood] = (moodWeights[s.mood] ?? 0) + w;
      for (const t of s.tags ?? []) tagWeights[t] = (tagWeights[t] ?? 0) + w * 0.7;
      if (s.language)
        languageWeights[s.language] = (languageWeights[s.language] ?? 0) + w * 0.5;
    };

    for (const h of history) {
      let w = decayForPlayedAt(h.playedAt);
      if (h.duration != null && h.duration < 30) w *= 0.3; // skipped quickly
      addSong(h.song as any, w);
    }
    for (const l of likedSongs) addSong(l.song as any, 4);
    for (const p of playlistAdds) addSong(p.song as any, 2);
    for (const la of likedArtists) {
      artistWeights[la.artistId] = (artistWeights[la.artistId] ?? 0) + 3;
      artistNames.set(la.artistId, la.artist.name);
      totalWeight += 3;
    }

    // Resolve display names for top genres/artists seen only via history
    const topGenreIds = Object.keys(genreWeights).filter((id) => !genreNames.has(id));
    if (topGenreIds.length > 0) {
      const genres = await prisma.genre.findMany({
        where: { id: { in: topGenreIds.slice(0, 20) } },
        select: { id: true, name: true },
      });
      for (const g of genres) genreNames.set(g.id, g.name);
    }
    const topArtistIds = Object.entries(artistWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([id]) => id)
      .filter((id) => !artistNames.has(id));
    if (topArtistIds.length > 0) {
      const artists = await prisma.artist.findMany({
        where: { id: { in: topArtistIds } },
        select: { id: true, name: true },
      });
      for (const a of artists) artistNames.set(a.id, a.name);
    }

    const normalize = (m: Record<string, number>) => {
      const max = Math.max(0, ...Object.values(m));
      if (max <= 0) return m;
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(m)) out[k] = v / max;
      return out;
    };

    const recentSongIds = history.slice(0, 40).map((h) => h.songId);
    const likedSongIds = likedSongs.map((l) => l.songId);

    return {
      hasSignal: totalWeight > 0,
      totalWeight,
      genreWeights: normalize(genreWeights),
      artistWeights: normalize(artistWeights),
      moodWeights: normalize(moodWeights),
      tagWeights: normalize(tagWeights),
      languageWeights: normalize(languageWeights),
      topGenres: topEntries(normalize(genreWeights), genreNames, 3) as TasteProfile["topGenres"],
      topArtists: topEntries(normalize(artistWeights), artistNames, 3) as TasteProfile["topArtists"],
      topMoods: topEntries(normalize(moodWeights), new Map(), 3, "mood") as TasteProfile["topMoods"],
      recentSongIds,
      likedSongIds,
    };
  });
}

export type ScoredSong<T> = T & { _score: number; _reason: string | null };

type CandidateSong = {
  id: string;
  genreId: string | null;
  mood: string | null;
  tags: string[];
  language: string | null;
  albumId: string | null;
  playCount: number;
  createdAt: Date;
  artists: { artistId: string }[];
};

function popularityBoost(playCount: number): number {
  return Math.log10(playCount + 1) * 0.6;
}

function freshnessBoost(createdAt: Date): number {
  const days = (Date.now() - createdAt.getTime()) / 86_400_000;
  if (days < 14) return 1;
  if (days < 60) return 0.5;
  return 0;
}

function personalizationScore(song: CandidateSong, profile: TasteProfile): number {
  let s = 0;
  if (song.genreId && profile.genreWeights[song.genreId])
    s += 4 * profile.genreWeights[song.genreId];
  for (const a of song.artists ?? []) {
    if (profile.artistWeights[a.artistId]) s += 6 * profile.artistWeights[a.artistId];
  }
  if (song.mood && profile.moodWeights[song.mood])
    s += 3 * profile.moodWeights[song.mood];
  for (const t of song.tags ?? []) {
    if (profile.tagWeights[t]) s += 1 * profile.tagWeights[t];
  }
  if (song.language && profile.languageWeights[song.language])
    s += 1 * profile.languageWeights[song.language];
  return Math.min(s, 12);
}

function contentScore(
  song: CandidateSong,
  seed: Pick<CandidateSong, "genreId" | "mood" | "tags" | "language" | "albumId" | "artists">,
): number {
  let s = 0;
  if (seed.genreId && song.genreId === seed.genreId) s += 4;
  const seedArtists = new Set((seed.artists ?? []).map((a) => a.artistId));
  const shared = (song.artists ?? []).filter((a) => seedArtists.has(a.artistId)).length;
  s += shared * 6;
  if (seed.albumId && song.albumId === seed.albumId) s += 5;
  if (seed.mood && song.mood === seed.mood) s += 3;
  if (seed.tags?.length && song.tags?.length) {
    const seedTags = new Set(seed.tags);
    const sharedTags = song.tags.filter((t) => seedTags.has(t)).length;
    s += Math.min(sharedTags, 3) * 1.2;
  }
  if (seed.language && song.language === seed.language) s += 1;
  return s;
}

export function buildReason(
  song: CandidateSong,
  profile: TasteProfile,
  seed: Pick<CandidateSong, "genreId" | "mood" | "albumId" | "artists"> | null,
  genreNameById: Map<string, string>,
  artistNameById: Map<string, string>,
): string | null {
  if (seed) {
    const seedArtists = new Set((seed.artists ?? []).map((a) => a.artistId));
    const sharedArtist = (song.artists ?? []).find((a) => seedArtists.has(a.artistId));
    if (sharedArtist && artistNameById.get(sharedArtist.artistId))
      return `More from ${artistNameById.get(sharedArtist.artistId)}`;
    if (seed.genreId && song.genreId === seed.genreId && genreNameById.get(song.genreId!))
      return `More ${genreNameById.get(song.genreId!)} like this`;
    if (seed.mood && song.mood === seed.mood) return `Same ${song.mood} mood`;
    if (seed.albumId && song.albumId === seed.albumId) return "From the same album";
  }
  if (profile.hasSignal) {
    // Pick the strongest personalized signal for this song
    const candidates: { label: string; w: number }[] = [];
    if (song.genreId && profile.genreWeights[song.genreId])
      candidates.push({
        label: `Because you like ${genreNameById.get(song.genreId) ?? "this genre"}`,
        w: 4 * profile.genreWeights[song.genreId],
      });
    for (const a of song.artists ?? []) {
      if (profile.artistWeights[a.artistId] && artistNameById.get(a.artistId))
        candidates.push({
          label: `Because you listen to ${artistNameById.get(a.artistId)}`,
          w: 6 * profile.artistWeights[a.artistId],
        });
    }
    if (song.mood && profile.moodWeights[song.mood])
      candidates.push({ label: `Matches your ${song.mood} mood`, w: 3 * profile.moodWeights[song.mood] });
    candidates.sort((a, b) => b.w - a.w);
    if (candidates[0] && candidates[0].w >= 1.2) return candidates[0].label;
    if (profile.topGenres[0]) return `Picked for ${profile.topGenres[0].name} fans`;
  }
  return null;
}

/** Greedy diversity re-rank: cap songs per artist so small catalogs feel varied. */
export function diversify<T extends CandidateSong>(
  scored: ScoredSong<T>[],
  maxPerArtist = 2,
): ScoredSong<T>[] {
  const perArtist = new Map<string, number>();
  const primary: ScoredSong<T>[] = [];
  const overflow: ScoredSong<T>[] = [];
  for (const s of scored) {
    const artistId = s.artists?.[0]?.artistId ?? `solo:${s.id}`;
    const count = perArtist.get(artistId) ?? 0;
    if (count < maxPerArtist) {
      primary.push(s);
      perArtist.set(artistId, count + 1);
    } else {
      overflow.push(s);
    }
  }
  return [...primary, ...overflow];
}

async function enrichNames(songs: CandidateSong[]) {
  const genreIds = [...new Set(songs.map((s) => s.genreId).filter(Boolean))] as string[];
  const artistIds = [...new Set(songs.flatMap((s) => (s.artists ?? []).map((a) => a.artistId)))];
  const [genres, artists] = await Promise.all([
    genreIds.length
      ? prisma.genre.findMany({ where: { id: { in: genreIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    artistIds.length
      ? prisma.artist.findMany({ where: { id: { in: artistIds } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);
  return {
    genreNameById: new Map(genres.map((g) => [g.id, g.name])),
    artistNameById: new Map(artists.map((a) => [a.id, a.name])),
  };
}

async function fetchTrending(limit: number, excludeIds: Set<string>) {
  const include = buildSongInclude(false);
  const songs = await prisma.song.findMany({
    where: { isPublished: true, ...(excludeIds.size ? { id: { notIn: [...excludeIds] } } : {}) },
    include,
    orderBy: [{ playCount: "desc" }, { createdAt: "desc" }],
    take: Math.max(limit, 1),
  });
  return songs;
}

/**
 * Personalized "For You" feed. Falls back to trending when the user has no
 * signal (cold start) or is anonymous — as requested.
 */
export async function getForYouSongs(opts: {
  userId?: string | null;
  limit?: number;
  excludeIds?: string[];
}) {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 25);
  const exclude = new Set(opts.excludeIds ?? []);

  return withRetry(async () => {
    const profile = await getUserTasteProfile(opts.userId);

    if (!profile.hasSignal) {
      const songs = await fetchTrending(limit, exclude);
      return { songs, profile, isPersonalized: false as const };
    }

    const include = buildSongInclude(false);
    const excludeAll = new Set([...exclude, ...profile.recentSongIds.slice(0, 10)]);

    const candidates = await prisma.song.findMany({
      where: {
        isPublished: true,
        ...(excludeAll.size ? { id: { notIn: [...excludeAll] } } : {}),
      },
      include: {
        ...include,
        artists: { select: { artistId: true } },
      },
      take: 250,
      orderBy: { playCount: "desc" },
    });

    if (candidates.length === 0) {
      const songs = await fetchTrending(limit, exclude);
      return { songs, profile, isPersonalized: false as const };
    }

    const { genreNameById, artistNameById } = await enrichNames(candidates as CandidateSong[]);

    let scored = (candidates as CandidateSong[]).map((song) => {
      const score =
        personalizationScore(song, profile) +
        popularityBoost(song.playCount) +
        freshnessBoost(song.createdAt) +
        Math.random() * 0.3; // tie-break for discovery variety
      return {
        ...song,
        _score: score,
        _reason: buildReason(song, profile, null, genreNameById, artistNameById),
      } as ScoredSong<CandidateSong>;
    });

    scored.sort((a, b) => b._score - a._score);
    scored = diversify(scored, 2).slice(0, limit);

    // Backfill from trending if the catalog is tiny
    if (scored.length < limit) {
      const backfill = await fetchTrending(
        (limit - scored.length) * 2,
        new Set([...excludeAll, ...scored.map((s) => s.id)]),
      );
      const full = await prisma.song.findMany({
        where: { id: { in: scored.map((s) => s.id) } },
        include,
      });
      const byId = new Map(full.map((s) => [s.id, s]));
      const ordered = scored.map((s) => ({
        ...(byId.get(s.id) ?? s),
        _reason: (s as ScoredSong<CandidateSong>)._reason,
        _score: (s as ScoredSong<CandidateSong>)._score,
      }));
      return {
        songs: [...ordered, ...backfill.slice(0, limit - ordered.length).map((s) => ({ ...s, _reason: null as string | null, _score: 0 }))],
        profile,
        isPersonalized: true as const,
      };
    }

    const full = await prisma.song.findMany({
      where: { id: { in: scored.map((s) => s.id) } },
      include,
    });
    const byId = new Map(full.map((s) => [s.id, s]));
    const ordered = scored.map((s) => ({
      ...(byId.get(s.id) ?? s),
      _reason: s._reason,
      _score: s._score,
    }));
    return { songs: ordered, profile, isPersonalized: true as const };
  });
}

/** Similar songs for a seed, boosted by the listener's taste when known. */
export async function getSimilarSongs(opts: {
  seedSongId: string;
  userId?: string | null;
  limit?: number;
  excludeIds?: string[];
}) {
  const limit = Math.min(Math.max(opts.limit ?? 10, 1), 25);
  const exclude = new Set([opts.seedSongId, ...(opts.excludeIds ?? [])]);

  return withRetry(async () => {
    const seed = await prisma.song.findUnique({
      where: { id: opts.seedSongId },
      select: {
        id: true,
        genreId: true,
        mood: true,
        tags: true,
        language: true,
        albumId: true,
        isPublished: true,
        artists: { select: { artistId: true } },
      },
    });
    if (!seed || !seed.isPublished) throw new Error("SONG_NOT_FOUND");

    const profile = await getUserTasteProfile(opts.userId);
    const seedArtistIds = (seed.artists ?? []).map((a) => a.artistId);

    const orClauses: any[] = [];
    if (seed.genreId) orClauses.push({ genreId: seed.genreId });
    if (seedArtistIds.length) orClauses.push({ artists: { some: { artistId: { in: seedArtistIds } } } });
    if (seed.mood) orClauses.push({ mood: seed.mood });
    if (seed.tags?.length) orClauses.push({ tags: { hasSome: seed.tags } });
    if (seed.albumId) orClauses.push({ albumId: seed.albumId });

    const include = buildSongInclude(false);
    let candidates: any[] = [];
    if (orClauses.length > 0) {
      candidates = await prisma.song.findMany({
        where: { isPublished: true, id: { notIn: [...exclude] }, OR: orClauses },
        include: { ...include, artists: { select: { artistId: true } } },
        take: limit * 4,
      });
    }
    if (candidates.length === 0) {
      candidates = await prisma.song.findMany({
        where: { isPublished: true, id: { notIn: [...exclude] } },
        include: { ...include, artists: { select: { artistId: true } } },
        orderBy: { playCount: "desc" },
        take: limit,
      });
      return { songs: candidates.map((s) => ({ ...s, _reason: null, _score: 0 })), profile, seed };
    }

    const { genreNameById, artistNameById } = await enrichNames([
      seed as unknown as CandidateSong,
      ...(candidates as CandidateSong[]),
    ]);

    let scored = (candidates as CandidateSong[]).map((song) => {
      const score =
        contentScore(song, seed as unknown as CandidateSong) +
        (profile.hasSignal ? personalizationScore(song, profile) * 0.5 : 0) +
        popularityBoost(song.playCount) * 0.5 +
        Math.random() * 0.3;
      return {
        ...song,
        _score: score,
        _reason: buildReason(song, profile, seed as unknown as CandidateSong, genreNameById, artistNameById),
      } as ScoredSong<CandidateSong>;
    });
    scored.sort((a, b) => b._score - a._score);

    // Shuffle within score tiers for variety (keeps small catalogs fresh)
    const byTier = new Map<number, ScoredSong<CandidateSong>[]>();
    for (const s of scored) {
      const tier = Math.floor(s._score);
      if (!byTier.has(tier)) byTier.set(tier, []);
      byTier.get(tier)!.push(s);
    }
    const result: ScoredSong<CandidateSong>[] = [];
    for (const tier of [...byTier.keys()].sort((a, b) => b - a)) {
      const bucket = [...(byTier.get(tier) ?? [])].sort(() => Math.random() - 0.5);
      for (const s of bucket) {
        if (result.length >= limit) break;
        result.push(s);
      }
      if (result.length >= limit) break;
    }

    if (result.length < limit) {
      const backfill = await prisma.song.findMany({
        where: {
          isPublished: true,
          id: { notIn: [...exclude, ...result.map((s) => s.id)] },
        },
        include,
        orderBy: { playCount: "desc" },
        take: (limit - result.length) * 2,
      });
      const extra = backfill
        .sort(() => Math.random() - 0.5)
        .slice(0, limit - result.length)
        .map((s) => ({ ...s, _reason: null as string | null, _score: 0 }));
      const ids = [...result.map((s) => s.id)];
      const full = await prisma.song.findMany({ where: { id: { in: ids } }, include });
      const byId = new Map(full.map((s) => [s.id, s]));
      return {
        songs: [
          ...result.map((s) => ({ ...(byId.get(s.id) ?? s), _reason: s._reason, _score: s._score })),
          ...extra,
        ],
        profile,
        seed,
      };
    }

    const full = await prisma.song.findMany({
      where: { id: { in: result.map((s) => s.id) } },
      include,
    });
    const byId = new Map(full.map((s) => [s.id, s]));
    return {
      songs: result.map((s) => ({ ...(byId.get(s.id) ?? s), _reason: s._reason, _score: s._score })),
      profile,
      seed,
    };
  });
}

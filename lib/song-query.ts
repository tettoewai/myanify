const MYANMAR_LYRIC_LANGUAGE = "my";

export function shouldIncludeLyrics(request?: Request): boolean {
  if (!request) return false;

  const include = new URL(request.url).searchParams.get("include");
  if (!include) return false;

  return include
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .includes("lyrics");
}

export function buildSongInclude(includeLyrics: boolean) {
  return {
    artists: {
      include: {
        artist: true,
      },
    },
    album: true,
    genre: true,
    ...(includeLyrics
      ? {
          lyrics: {
            where: {
              language: MYANMAR_LYRIC_LANGUAGE,
            },
          },
        }
      : {}),
  };
}

export function buildSongIncludeFromRequest(request: Request) {
  return buildSongInclude(shouldIncludeLyrics(request));
}

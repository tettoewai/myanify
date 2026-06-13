import Script from "next/script";

interface StructuredDataProps {
  data: Record<string, any>;
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Script
      id="structured-data"
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

interface MusicSongProps {
  name: string;
  artist: string;
  album?: string;
  duration?: string;
  image?: string;
  audioUrl?: string;
  url: string;
}

export function MusicSongStructuredData({
  name,
  artist,
  album,
  duration,
  image,
  audioUrl,
  url,
}: MusicSongProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MusicRecording",
    name,
    byArtist: {
      "@type": "MusicGroup",
      name: artist,
    },
    ...(album && {
      inAlbum: {
        "@type": "MusicAlbum",
        name: album,
      },
    }),
    ...(duration && { duration }),
    ...(image && { image }),
    ...(audioUrl && {
      audio: {
        "@type": "AudioObject",
        contentUrl: audioUrl,
      },
    }),
    url,
  };

  return <StructuredData data={data} />;
}

interface MusicArtistProps {
  name: string;
  image?: string;
  bio?: string;
  url: string;
  songCount?: number;
}

export function MusicArtistStructuredData({
  name,
  image,
  bio,
  url,
  songCount,
}: MusicArtistProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name,
    ...(image && { image }),
    ...(bio && { description: bio }),
    ...(songCount && {
      numberOfTracks: songCount,
    }),
    url,
  };

  return <StructuredData data={data} />;
}

interface MusicAlbumProps {
  name: string;
  image?: string;
  description?: string;
  url: string;
  songCount?: number;
  releaseDate?: string;
}

export function MusicAlbumStructuredData({
  name,
  image,
  description,
  url,
  songCount,
  releaseDate,
}: MusicAlbumProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MusicAlbum",
    name,
    ...(description && { description }),
    ...(image && { image }),
    ...(songCount && { numTracks: songCount }),
    ...(releaseDate && { datePublished: releaseDate }),
    url,
  };

  return <StructuredData data={data} />;
}

interface MusicPlaylistProps {
  name: string;
  description?: string;
  image?: string;
  url: string;
  songCount?: number;
  creator?: string;
}

export function MusicPlaylistStructuredData({
  name,
  description,
  image,
  url,
  songCount,
  creator,
}: MusicPlaylistProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MusicPlaylist",
    name,
    ...(description && { description }),
    ...(image && { image }),
    ...(songCount && {
      numTracks: songCount,
    }),
    ...(creator && {
      creator: {
        "@type": "Person",
        name: creator,
      },
    }),
    url,
  };

  return <StructuredData data={data} />;
}

interface MusicGenreProps {
  name: string;
  description?: string;
  image?: string;
  url: string;
  songCount?: number;
}

export function MusicGenreStructuredData({
  name,
  description,
  image,
  url,
  songCount,
}: MusicGenreProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "MusicGenre",
    name,
    ...(description && { description }),
    ...(image && { image }),
    ...(songCount && { numberOfTracks: songCount }),
    url,
  };

  return <StructuredData data={data} />;
}

interface WebsiteProps {
  name: string;
  url: string;
  description: string;
  logo?: string;
}

export function WebsiteStructuredData({
  name,
  url,
  description,
  logo,
}: WebsiteProps) {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    description,
    ...(logo && { logo }),
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return <StructuredData data={data} />;
}


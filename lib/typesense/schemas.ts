import type { CollectionFieldSchema } from "typesense";

export type TypesenseCollectionSchema = {
  name: string;
  fields: CollectionFieldSchema[];
  default_sorting_field?: string;
};

export const collections: TypesenseCollectionSchema[] = [
  {
    name: "songs",
    fields: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "englishTitle", type: "string" },
      { name: "artistNames", type: "string[]" },
      { name: "albumTitle", type: "string" },
      { name: "albumId", type: "string" },
      { name: "genreNames", type: "string[]" },
      { name: "duration", type: "int32" },
      { name: "releaseDate", type: "int64" },
      { name: "isPremium", type: "bool" },
      { name: "isPublished", type: "bool" },
      { name: "playCount", type: "int32" },
      { name: "language", type: "string" },
    ],
    default_sorting_field: "releaseDate",
  },
  {
    name: "artists",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "englishName", type: "string" },
      { name: "slug", type: "string" },
      { name: "genreNames", type: "string[]" },
      { name: "monthlyListeners", type: "int32" },
      { name: "country", type: "string" },
    ],
  },
  {
    name: "albums",
    fields: [
      { name: "id", type: "string" },
      { name: "title", type: "string" },
      { name: "englishName", type: "string" },
      { name: "artistNames", type: "string[]" },
      { name: "releaseDate", type: "int64" },
      { name: "albumType", type: "string" }, // SINGLE, EP, ALBUM
    ],
    default_sorting_field: "releaseDate",
  },
  {
    name: "genres",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "englishName", type: "string" },
      { name: "slug", type: "string" },
      { name: "description", type: "string" },
    ],
  },
  {
    name: "playlists",
    fields: [
      { name: "id", type: "string" },
      { name: "name", type: "string" },
      { name: "englishName", type: "string" },
      { name: "slug", type: "string" },
      { name: "description", type: "string" },
      { name: "isPublic", type: "bool" },
      { name: "createdBy", type: "string" }, // user id
      { name: "createdAt", type: "int64" },
    ],
    default_sorting_field: "createdAt",
  },
];

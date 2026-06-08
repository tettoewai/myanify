import { Client } from "typesense";

let adminClient: Client | null = null;
let searchClient: Client | null = null;

export function getAdminClient() {
  if (!adminClient) {
    adminClient = new Client({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST!,
          port: parseInt(process.env.TYPESENSE_PORT!),
          protocol: process.env.TYPESENSE_PROTOCOL as "http" | "https",
        },
      ],
      apiKey: process.env.TYPESENSE_ADMIN_API_KEY!,
      connectionTimeoutSeconds: 120,
    });
  }
  return adminClient;
}

export function getSearchClient() {
  if (!searchClient) {
    searchClient = new Client({
      nodes: [
        {
          host: process.env.TYPESENSE_HOST!,
          port: parseInt(process.env.TYPESENSE_PORT!),
          protocol: process.env.TYPESENSE_PROTOCOL as "http" | "https",
        },
      ],
      apiKey: process.env.TYPESENSE_SEARCH_API_KEY!,
    });
  }
  return searchClient;
}

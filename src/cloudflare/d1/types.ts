// Database record types (for backward compatibility)
export type ProcessedImage = {
  readonly id: string;
  readonly file_name: string;
  readonly drive_file_id: string;
  readonly processed_at: string; // ISO date string
  readonly moved_to_saved: boolean;
};

export type ProcessedImageInsert = {
  readonly id: string;
  readonly file_name: string;
  readonly drive_file_id: string;
  readonly processed_at: string;
  readonly moved_to_saved?: boolean;
};

// Configuration types
export type D1Config = {
  readonly accountId: string;
  readonly apiToken: string;
  readonly databaseId: string;
};

// Import Cloudflare Workers global types
/// <reference types="@cloudflare/workers-types" />

// Re-export Prisma client type for database operations
export type { PrismaD1Client } from "./prisma";

// Use Cloudflare's official D1Database type for Workers environment
export type CloudflareD1Database = D1Database;

// For backward compatibility, keep D1Database as Prisma client type
// (This is what the existing code expects)
export type D1Database = import("./prisma").PrismaD1Client;

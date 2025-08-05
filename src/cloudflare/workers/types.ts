// Cloudflare Workers environment types
import type { RelearnResult } from "../../relearn/types";

// Import Cloudflare Workers global types
/// <reference types="@cloudflare/workers-types" />

export interface WorkerEnv {
  DB: D1Database;
  GOOGLE_SERVICE_ACCOUNT_KEY: string;
  GOOGLE_DRIVE_FOLDER_ID: string;
  SLACK_WEBHOOK_URL: string;
  IMAGE_COUNT: string;
  GEMINI_API_KEY: string;
}

// Worker request context
export interface WorkerContext {
  env: WorkerEnv;
  ctx: ExecutionContext;
}

// API response types
export interface RelearnResponse {
  success: boolean;
  data?: RelearnResult;
  error?: string;
}

// Scheduled event handler type
export type ScheduledHandler = (
  event: ScheduledEvent,
  env: WorkerEnv,
  ctx: ExecutionContext
) => Promise<void>;

// Fetch handler type
export type FetchHandler = (
  request: Request,
  env: WorkerEnv,
  ctx: ExecutionContext
) => Promise<Response>;

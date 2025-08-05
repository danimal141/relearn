import type { AsyncResult } from "../types";

export interface OcrRequest {
  imageData: Buffer;
  mimeType: string;
  driveFileId: string;
}

export interface OcrResponse {
  text: string;
  confidence?: number;
  extractedAt: Date;
}

export interface OcrError {
  code: "API_ERROR" | "RATE_LIMIT" | "TIMEOUT" | "INVALID_IMAGE";
  message: string;
  details?: unknown;
}

export type OcrResult = AsyncResult<OcrResponse, OcrError>;

export interface SummaryRequest {
  text: string;
  promptType?: "default" | "custom";
  customPrompt?: string;
}

export interface SummaryResponse {
  summary: string;
  generatedAt: Date;
}

export interface SummaryError {
  code: "API_ERROR" | "RATE_LIMIT" | "TIMEOUT" | "INVALID_INPUT";
  message: string;
  details?: unknown;
}

export type SummaryResult = AsyncResult<SummaryResponse, SummaryError>;

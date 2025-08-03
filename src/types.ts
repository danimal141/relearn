import type { drive_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { IncomingWebhook, IncomingWebhookResult } from "@slack/webhook";

// Configuration types
export type AppConfig = {
  readonly googleServiceAccountKey: string;
  readonly googleDriveFolderId: string;
  readonly slackWebhookUrl: string;
  readonly imageCount: number;
};

// Google Drive types
export type DriveClient = drive_v3.Drive;
export type DriveFile = drive_v3.Schema$File;
export type AuthClient = OAuth2Client;

export type DriveCredentials = {
  readonly type: string;
  readonly project_id: string;
  readonly private_key_id: string;
  readonly private_key: string;
  readonly client_email: string;
  readonly client_id: string;
  readonly auth_uri: string;
  readonly token_uri: string;
  readonly auth_provider_x509_cert_url: string;
  readonly client_x509_cert_url: string;
};

// Slack types
export type SlackWebhook = IncomingWebhook;
export type SlackResult = IncomingWebhookResult;

// Error types
export type AppError =
  | { readonly type: "ConfigError"; readonly message: string }
  | { readonly type: "AuthError"; readonly message: string }
  | { readonly type: "DriveError"; readonly message: string }
  | { readonly type: "SlackError"; readonly message: string };

// Result types
export type ImageResult = {
  readonly files: readonly DriveFile[];
  readonly links: readonly string[];
};

export type RelearnResult = {
  readonly images: ImageResult;
  readonly slackResults: readonly SlackResult[];
  readonly status: "success" | "partial" | "failed";
};

// Utility types
export type NonEmptyArray<T> = readonly [T, ...T[]];

export type AsyncResult<T, E = AppError> = Promise<
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E }
>;

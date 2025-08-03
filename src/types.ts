// Configuration types
export type AppConfig = {
  readonly googleServiceAccountKey: string;
  readonly googleDriveFolderId: string;
  readonly slackWebhookUrl: string;
  readonly imageCount: number;
  readonly cloudflareAccountId: string;
  readonly cloudflareApiToken: string;
  readonly cloudflareDatabaseId: string;
};

// Error types
export type AppError =
  | { readonly type: "ConfigError"; readonly message: string }
  | { readonly type: "AuthError"; readonly message: string }
  | { readonly type: "DriveError"; readonly message: string }
  | { readonly type: "SlackError"; readonly message: string }
  | { readonly type: "D1Error"; readonly message: string };

// Utility types
export type NonEmptyArray<T> = readonly [T, ...T[]];

export type AsyncResult<T, E = AppError> = Promise<
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: E }
>;

import * as GoogleDrive from "../googledrive/googledrive";
import * as Slack from "../slack/slack";
import * as D1 from "../cloudflare/d1/client";
import type { AppConfig, AsyncResult } from "../types";
import type { DriveClient, AuthClient } from "../googledrive/types";
import type { SlackResult } from "../slack/types";
import type { D1Database } from "../cloudflare/d1/types";
import type { RelearnResult, ImageResult } from "./types";

// Configuration validation
export const validateConfig = (config: Partial<AppConfig>): config is AppConfig => {
  return !!(
    config.googleServiceAccountKey &&
    config.googleDriveFolderId &&
    config.slackWebhookUrl &&
    typeof config.imageCount === "number" &&
    config.imageCount > 0 &&
    config.cloudflareAccountId &&
    config.cloudflareApiToken &&
    config.cloudflareDatabaseId
  );
};

// Parse config from environment
export const parseConfigFromEnv = (): AsyncResult<AppConfig> => {
  const config = {
    googleServiceAccountKey: process.env["GOOGLE_SERVICE_ACCOUNT_KEY"] || "",
    googleDriveFolderId: process.env["GOOGLE_DRIVE_FOLDER_ID"] || "",
    slackWebhookUrl: process.env["SLACK_WEBHOOK_URL"] || "",
    imageCount: Number.parseInt(process.env["IMAGE_COUNT"] || "5", 10),
    cloudflareAccountId: process.env["CLOUDFLARE_ACCOUNT_ID"] || "",
    cloudflareApiToken: process.env["CLOUDFLARE_API_TOKEN"] || "",
    cloudflareDatabaseId: process.env["CLOUDFLARE_DATABASE_ID"] || "",
  };

  if (!validateConfig(config)) {
    return Promise.resolve({
      success: false,
      error: {
        type: "ConfigError",
        message: "Missing required environment variables: GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_FOLDER_ID, SLACK_WEBHOOK_URL, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_DATABASE_ID"
      }
    });
  }

  return Promise.resolve({ success: true, data: config });
};

// Core workflow functions
export const initializeGoogleDrive = async (
  serviceAccountKey: string
): AsyncResult<{ auth: AuthClient; drive: DriveClient }> => {
  const authResult = await GoogleDrive.createAuthClient(serviceAccountKey);

  if (!authResult.success) {
    return authResult;
  }

  const drive = GoogleDrive.createDriveClient(authResult.data);

  return {
    success: true,
    data: {
      auth: authResult.data,
      drive
    }
  };
};

export const initializeD1Database = async (
  accountId: string,
  apiToken: string,
  databaseId: string
): AsyncResult<D1Database> => {
  const clientResult = await D1.createD1Client({
    accountId,
    apiToken,
    databaseId
  });

  if (!clientResult.success) {
    return clientResult;
  }

  const db = clientResult.data;

  // Initialize database schema
  const initResult = await D1.initializeDatabase(db);

  if (!initResult.success) {
    return initResult;
  }

  return { success: true, data: db };
};

export const fetchRandomImages = async (
  drive: DriveClient,
  folderId: string,
  count: number
): AsyncResult<ImageResult> => {
  const imagesResult = await GoogleDrive.getRandomImages(drive, folderId, count);

  if (!imagesResult.success) {
    return imagesResult;
  }

  const linksResult = await GoogleDrive.getPublicLinks(drive, imagesResult.data);

  if (!linksResult.success) {
    return linksResult;
  }

  return {
    success: true,
    data: {
      files: imagesResult.data,
      links: linksResult.data
    }
  };
};

export const fetchUnprocessedRandomImages = async (
  drive: DriveClient,
  db: D1Database,
  folderId: string,
  count: number
): AsyncResult<ImageResult> => {
  const imagesResult = await GoogleDrive.getUnprocessedRandomImages(drive, db, folderId, count);

  if (!imagesResult.success) {
    return imagesResult;
  }

  const linksResult = await GoogleDrive.getPublicLinks(drive, imagesResult.data);

  if (!linksResult.success) {
    return linksResult;
  }

  return {
    success: true,
    data: {
      files: imagesResult.data,
      links: linksResult.data
    }
  };
};

export const sendImagesToSlack = async (
  webhookUrl: string,
  imageResult: ImageResult
): AsyncResult<readonly SlackResult[]> => {
  return Slack.sendBatchImageNotification(
    webhookUrl,
    imageResult.links,
    "Daily relearn images"
  );
};

// Legacy workflow (without D1 optimization)
export const executeRelearnWorkflow = async (
  config: AppConfig
): AsyncResult<RelearnResult> => {
  // Initialize Google Drive
  const driveResult = await initializeGoogleDrive(config.googleServiceAccountKey);

  if (!driveResult.success) {
    return driveResult;
  }

  // Fetch random images
  const imageResult = await fetchRandomImages(
    driveResult.data.drive,
    config.googleDriveFolderId,
    config.imageCount
  );

  if (!imageResult.success) {
    return imageResult;
  }

  // Send to Slack
  const slackResult = await sendImagesToSlack(
    config.slackWebhookUrl,
    imageResult.data
  );

  if (!slackResult.success) {
    // Even if Slack fails, we still have the image data
    return {
      success: true,
      data: {
        images: imageResult.data,
        slackResults: [],
        status: "partial"
      }
    };
  }

  return {
    success: true,
    data: {
      images: imageResult.data,
      slackResults: slackResult.data,
      status: "success"
    }
  };
};

// Optimized workflow with D1 database and image management
export const executeOptimizedRelearnWorkflow = async (
  config: AppConfig
): AsyncResult<RelearnResult> => {
  // Initialize Google Drive
  const driveResult = await initializeGoogleDrive(config.googleServiceAccountKey);

  if (!driveResult.success) {
    return driveResult;
  }

  // Initialize D1 Database
  const dbResult = await initializeD1Database(
    config.cloudflareAccountId,
    config.cloudflareApiToken,
    config.cloudflareDatabaseId
  );

  if (!dbResult.success) {
    return dbResult;
  }

  // Fetch unprocessed random images
  const imageResult = await fetchUnprocessedRandomImages(
    driveResult.data.drive,
    dbResult.data,
    config.googleDriveFolderId,
    config.imageCount
  );

  if (!imageResult.success) {
    return imageResult;
  }

  // Check if we found any unprocessed images
  if (imageResult.data.files.length === 0) {
    return {
      success: true,
      data: {
        images: imageResult.data,
        slackResults: [],
        status: "success"
      }
    };
  }

  // Send to Slack
  const slackResult = await sendImagesToSlack(
    config.slackWebhookUrl,
    imageResult.data
  );

  // Process and move images (regardless of Slack success)
  const processResult = await GoogleDrive.processAndMoveImages(
    driveResult.data.drive,
    dbResult.data,
    imageResult.data.files,
    config.googleDriveFolderId
  );

  if (!processResult.success) {
    // Log processing failure but continue
    console.warn("Failed to process and move images:", processResult.error.message);
  }

  if (!slackResult.success) {
    // Even if Slack fails, we processed the images
    return {
      success: true,
      data: {
        images: imageResult.data,
        slackResults: [],
        status: "partial"
      }
    };
  }

  return {
    success: true,
    data: {
      images: imageResult.data,
      slackResults: slackResult.data,
      status: "success"
    }
  };
};

// Convenience function that handles config parsing (legacy)
export const runRelearn = async (): AsyncResult<RelearnResult> => {
  const configResult = await parseConfigFromEnv();

  if (!configResult.success) {
    return configResult;
  }

  return executeRelearnWorkflow(configResult.data);
};

// Convenience function that handles config parsing (optimized)
export const runOptimizedRelearn = async (): AsyncResult<RelearnResult> => {
  const configResult = await parseConfigFromEnv();

  if (!configResult.success) {
    return configResult;
  }

  return executeOptimizedRelearnWorkflow(configResult.data);
};

// Helper functions for specific use cases
export const relearnSingleImage = async (
  config: AppConfig
): AsyncResult<RelearnResult> => {
  return executeRelearnWorkflow({ ...config, imageCount: 1 });
};

export const relearnMultipleImages = async (
  config: AppConfig,
  count: number
): AsyncResult<RelearnResult> => {
  return executeRelearnWorkflow({ ...config, imageCount: count });
};

// Dry run function (for testing)
export const dryRunRelearn = async (
  config: AppConfig
): AsyncResult<ImageResult> => {
  const driveResult = await initializeGoogleDrive(config.googleServiceAccountKey);

  if (!driveResult.success) {
    return driveResult;
  }

  return fetchRandomImages(
    driveResult.data.drive,
    config.googleDriveFolderId,
    config.imageCount
  );
};

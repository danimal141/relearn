import * as D1 from "../cloudflare/d1/client";
import { createPrismaD1Client } from "../cloudflare/d1/prisma";
import type { D1Database } from "../cloudflare/d1/types";
import * as GoogleDrive from "../googledrive/googledrive";
import type { AuthClient, DriveClient } from "../googledrive/types";
import * as Slack from "../slack/slack";
import type { SlackResult } from "../slack/types";
import type { AppConfig, AsyncResult } from "../types";
import { processMultipleImagesWithOcr } from "./ocr-processor";
import type { ImageResult, RelearnResult } from "./types";

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
    config.cloudflareDatabaseId &&
    config.geminiApiKey
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
    geminiApiKey: process.env["GEMINI_API_KEY"] || "",
  };

  if (!validateConfig(config)) {
    return Promise.resolve({
      success: false,
      error: {
        type: "ConfigError",
        message:
          "Missing required environment variables: GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_FOLDER_ID, SLACK_WEBHOOK_URL, CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_DATABASE_ID, GEMINI_API_KEY",
      },
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
      drive,
    },
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
    databaseId,
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
      links: linksResult.data,
    },
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
      links: linksResult.data,
    },
  };
};

export const sendImagesToSlack = async (
  webhookUrl: string,
  imageResult: ImageResult
): AsyncResult<readonly SlackResult[]> => {
  return Slack.sendBatchImageNotification(webhookUrl, imageResult.links, "Daily relearn images");
};

// Legacy workflow (without D1 optimization)
export const executeRelearnWorkflow = async (config: AppConfig): AsyncResult<RelearnResult> => {
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
  const slackResult = await sendImagesToSlack(config.slackWebhookUrl, imageResult.data);

  if (!slackResult.success) {
    // Even if Slack fails, we still have the image data
    return {
      success: true,
      data: {
        images: imageResult.data,
        slackResults: [],
        ocrResults: undefined,
        status: "partial",
      },
    };
  }

  return {
    success: true,
    data: {
      images: imageResult.data,
      slackResults: slackResult.data,
      ocrResults: undefined,
      status: "success",
    },
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

  // Initialize Prisma D1 Database
  const prismaResult = await createPrismaD1Client({
    accountId: config.cloudflareAccountId,
    apiToken: config.cloudflareApiToken,
    databaseId: config.cloudflareDatabaseId,
  });

  if (!prismaResult.success) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: prismaResult.error.message,
      },
    };
  }

  const prismaClient = prismaResult.data;

  // Fetch unprocessed random images using regular D1 for now
  const dbResult = await initializeD1Database(
    config.cloudflareAccountId,
    config.cloudflareApiToken,
    config.cloudflareDatabaseId
  );

  if (!dbResult.success) {
    return dbResult;
  }

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
        ocrResults: undefined,
        status: "success",
      },
    };
  }

  // Process images with OCR
  const ocrResult = await processMultipleImagesWithOcr({
    driveClient: driveResult.data.drive,
    prismaClient,
    geminiApiKey: config.geminiApiKey,
    files: imageResult.data.files,
    maxConcurrent: 3,
  });

  if (!ocrResult.success) {
    console.warn("OCR processing failed:", ocrResult.error.message);
    // Continue without OCR results
  }

  // Send to Slack
  const slackResult = await sendImagesToSlack(config.slackWebhookUrl, imageResult.data);

  // Mark images as moved (if OCR was successful)
  if (ocrResult.success && ocrResult.data.length > 0) {
    const processResult = await GoogleDrive.moveMultipleImagesToSaved(
      driveResult.data.drive,
      imageResult.data.files
        .map((file) => file.id)
        .filter((id): id is string => id !== null && id !== undefined),
      config.googleDriveFolderId
    );

    if (!processResult.success) {
      console.warn("Failed to move images to saved:", processResult.error.message);
    }
  }

  if (!slackResult.success) {
    // Even if Slack fails, we processed the images
    return {
      success: true,
      data: {
        images: imageResult.data,
        slackResults: [],
        ocrResults: ocrResult.success ? ocrResult.data : undefined,
        status: "partial",
      },
    };
  }

  return {
    success: true,
    data: {
      images: imageResult.data,
      slackResults: slackResult.data,
      ocrResults: ocrResult.success ? ocrResult.data : undefined,
      status: "success",
    },
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
export const relearnSingleImage = async (config: AppConfig): AsyncResult<RelearnResult> => {
  return executeRelearnWorkflow({ ...config, imageCount: 1 });
};

export const relearnMultipleImages = async (
  config: AppConfig,
  count: number
): AsyncResult<RelearnResult> => {
  return executeRelearnWorkflow({ ...config, imageCount: count });
};

// Dry run function (for testing)
export const dryRunRelearn = async (config: AppConfig): AsyncResult<ImageResult> => {
  const driveResult = await initializeGoogleDrive(config.googleServiceAccountKey);

  if (!driveResult.success) {
    return driveResult;
  }

  return fetchRandomImages(driveResult.data.drive, config.googleDriveFolderId, config.imageCount);
};

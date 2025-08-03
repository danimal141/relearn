import * as GoogleDrive from "../googledrive/googledrive";
import * as Slack from "../slack/slack";
import type {
  AppConfig,
  RelearnResult,
  ImageResult,
  AsyncResult,
  DriveClient,
  AuthClient,
  SlackResult
} from "../types";

// Configuration validation
export const validateConfig = (config: Partial<AppConfig>): config is AppConfig => {
  return !!(
    config.googleServiceAccountKey &&
    config.googleDriveFolderId &&
    config.slackWebhookUrl &&
    typeof config.imageCount === "number" &&
    config.imageCount > 0
  );
};

// Parse config from environment
export const parseConfigFromEnv = (): AsyncResult<AppConfig> => {
  const config = {
    googleServiceAccountKey: process.env["GOOGLE_SERVICE_ACCOUNT_KEY"] || "",
    googleDriveFolderId: process.env["GOOGLE_DRIVE_FOLDER_ID"] || "",
    slackWebhookUrl: process.env["SLACK_WEBHOOK_URL"] || "",
    imageCount: Number.parseInt(process.env["IMAGE_COUNT"] || "5", 10),
  };

  if (!validateConfig(config)) {
    return Promise.resolve({
      success: false,
      error: {
        type: "ConfigError",
        message: "Missing required environment variables: GOOGLE_SERVICE_ACCOUNT_KEY, GOOGLE_DRIVE_FOLDER_ID, SLACK_WEBHOOK_URL"
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

// Main relearn workflow
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

// Convenience function that handles config parsing
export const runRelearn = async (): AsyncResult<RelearnResult> => {
  const configResult = await parseConfigFromEnv();

  if (!configResult.success) {
    return configResult;
  }

  return executeRelearnWorkflow(configResult.data);
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

import { google } from "googleapis";
import type {
  AuthClient,
  DriveClient,
  DriveFile,
  DriveCredentials,
  AsyncResult,
  AppError
} from "../types";

// Authentication functions
export const createAuthClient = (serviceAccountKey: string): AsyncResult<AuthClient> => {
  try {
    const credentials: DriveCredentials = JSON.parse(serviceAccountKey);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    }).fromJSON(credentials) as AuthClient;

    return Promise.resolve({ success: true, data: auth });
  } catch (error) {
    return Promise.resolve({
      success: false,
      error: {
        type: "AuthError",
        message: `Failed to create auth client: ${String(error)}`
      }
    });
  }
};

export const createDriveClient = (auth: AuthClient): DriveClient =>
  google.drive({ version: "v3", auth });

// File operations
export const getImageFiles = async (
  drive: DriveClient,
  folderId: string
): AsyncResult<readonly DriveFile[]> => {
  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`,
      fields: "files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
      pageSize: 1000,
    });

    const files = response.data.files || [];
    return { success: true, data: files };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "DriveError",
        message: `Failed to fetch files from folder ${folderId}: ${String(error)}`
      }
    };
  }
};

// Pure functions for array operations
export const selectRandomItems = <T>(items: readonly T[], count: number): readonly T[] => {
  if (items.length === 0) return [];

  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, items.length));
};

export const getRandomImages = async (
  drive: DriveClient,
  folderId: string,
  count = 1
): AsyncResult<readonly DriveFile[]> => {
  const filesResult = await getImageFiles(drive, folderId);

  if (!filesResult.success) {
    return filesResult;
  }

  const selectedFiles = selectRandomItems(filesResult.data, count);
  return { success: true, data: selectedFiles };
};

// Permission and link functions
export const createPublicPermission = async (
  drive: DriveClient,
  fileId: string
): AsyncResult<void> => {
  try {
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "DriveError",
        message: `Failed to create public permission for file ${fileId}: ${String(error)}`
      }
    };
  }
};

export const getFileLink = async (
  drive: DriveClient,
  fileId: string
): AsyncResult<string> => {
  try {
    const file = await drive.files.get({
      fileId,
      fields: "webViewLink, webContentLink",
    });

    const link = file.data.webContentLink || file.data.webViewLink;

    if (!link) {
      return {
        success: false,
        error: {
          type: "DriveError",
          message: `No link available for file ${fileId}`
        }
      };
    }

    return { success: true, data: link };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "DriveError",
        message: `Failed to get link for file ${fileId}: ${String(error)}`
      }
    };
  }
};

export const createPublicLink = async (
  drive: DriveClient,
  fileId: string
): AsyncResult<string> => {
  const permissionResult = await createPublicPermission(drive, fileId);

  if (!permissionResult.success) {
    return permissionResult;
  }

  return getFileLink(drive, fileId);
};

// Batch operations
export const getPublicLinks = async (
  drive: DriveClient,
  files: readonly DriveFile[]
): AsyncResult<readonly string[]> => {
  const validFiles = files.filter(file => file.id);

  if (validFiles.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const linkPromises = validFiles.map(file => {
      if (!file.id) {
        throw new Error("File ID is missing");
      }
      return createPublicLink(drive, file.id);
    });
    const linkResults = await Promise.all(linkPromises);

    const successfulLinks: string[] = [];
    const errors: AppError[] = [];

    for (const result of linkResults) {
      if (result.success) {
        successfulLinks.push(result.data);
      } else {
        errors.push(result.error);
      }
    }

    // If any links were created successfully, return them
    if (successfulLinks.length > 0) {
      return { success: true, data: successfulLinks };
    }

    // If no links were created, return the first error
    return {
      success: false,
      error: errors[0] || {
        type: "DriveError",
        message: "Failed to create any public links"
      }
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "DriveError",
        message: `Failed to create public links: ${String(error)}`
      }
    };
  }
};

// File metadata
export const getImageMetadata = async (
  drive: DriveClient,
  fileId: string
): AsyncResult<DriveFile> => {
  try {
    const response = await drive.files.get({
      fileId,
      fields: "id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink",
    });

    return { success: true, data: response.data };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "DriveError",
        message: `Failed to fetch metadata for file ${fileId}: ${String(error)}`
      }
    };
  }
};

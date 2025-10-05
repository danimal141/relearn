import { google, drive_v3 } from "googleapis";
import { shuffle, take } from "es-toolkit";
import {
  DriveAdapter,
  DriveOperationFailure,
  DriveOperationResult,
} from "../relearn/interfaces/drive-adapter.interface";

interface GoogleCredentials {
  client_email: string;
  private_key: string;
}

export const TARGET_FILE_LIMIT = 1;
export const ASSET_FILE_LIMIT = 100;
export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
] as const;

const IMAGE_MIME_TYPE_SET = new Set<string>(IMAGE_MIME_TYPES);

type GoogleDriveAdapter = {
  readonly drive: drive_v3.Drive;
  readonly folderId: string;
};

const toFailure = (id: string, error: unknown): DriveOperationFailure => ({
  id,
  reason: error instanceof Error ? error.message : String(error),
});

const createResult = (): DriveOperationResult => ({
  succeeded: [],
  failed: [],
});

const listFiles = async (
  adapter: GoogleDriveAdapter,
  folderId: string,
  limit: number = ASSET_FILE_LIMIT
): Promise<drive_v3.Schema$File[]> => {
  try {
    const response = await adapter.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      pageSize: limit,
      fields: "files(id, name, mimeType)",
    });
    return response.data.files || [];
  } catch (err) {
    console.error(err);
    return [];
  }
};

const getOrCreateTmpFolder = async (
  adapter: GoogleDriveAdapter
): Promise<string> => {
  // Check if tmp folder already exists
  const response = await adapter.drive.files.list({
    q: `'${adapter.folderId}' in parents and name = 'tmp' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: "files(id)",
  });

  if (response.data.files && response.data.files.length > 0) {
    const folderId = response.data.files[0].id;
    if (!folderId) throw new Error("Failed to get tmp folder ID");
    return folderId;
  }

  // Create tmp folder
  const folder = await adapter.drive.files.create({
    requestBody: {
      name: "tmp",
      mimeType: "application/vnd.google-apps.folder",
      parents: [adapter.folderId],
    },
    fields: "id",
  });

  const folderId = folder.data.id;
  if (!folderId) throw new Error("Failed to create tmp folder");
  return folderId;
};

const getTargetPaths = async (
  adapter: GoogleDriveAdapter
): Promise<string[]> => {
  const files = await listFiles(adapter, adapter.folderId);
  if (files.length === 0) return [];

  const imageFiles = files.filter((file) =>
    IMAGE_MIME_TYPE_SET.has(file.mimeType ?? "")
  );

  return take(
    shuffle(imageFiles.map((file) => file.id)),
    TARGET_FILE_LIMIT
  ).filter((id): id is string => id != null);
};

const getAssetLinks = async (
  adapter: GoogleDriveAdapter,
  fileIds: string[]
): Promise<string[]> => {
  const links = await Promise.all(
    fileIds.map(async (fileId) => {
      try {
        // Check if file is already shared
        const permissions = await adapter.drive.permissions.list({
          fileId: fileId,
          fields: "permissions(id, type)",
        });

        const isPublic = permissions.data.permissions?.some(
          (p) => p.type === "anyone"
        );

        if (!isPublic) {
          // Create public share permission
          await adapter.drive.permissions.create({
            fileId: fileId,
            requestBody: {
              role: "reader",
              type: "anyone",
            },
          });
        }

        // Return usercontent link for Slack preview
        return `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0`;
      } catch (err) {
        console.error(`Failed to create link for ${fileId}:`, err);
        return null;
      }
    })
  );

  return links.filter((link): link is string => link != null);
};

const evacuateRelearnedFiles = async (
  adapter: GoogleDriveAdapter,
  fileIds: string[]
): Promise<DriveOperationResult> => {
  const tmpFolderId = await getOrCreateTmpFolder(adapter);

  const result = createResult();
  for (const fileId of fileIds) {
    try {
      await adapter.drive.files.update({
        fileId: fileId,
        addParents: tmpFolderId,
        removeParents: adapter.folderId,
      });
      result.succeeded.push(fileId);
    } catch (err) {
      console.error(`Failed to move file ${fileId}:`, err);
      result.failed.push(toFailure(fileId, err));
    }
  }

  return result;
};

const reviveSharedFiles = async (
  adapter: GoogleDriveAdapter
): Promise<DriveOperationResult> => {
  const tmpFolderId = await getOrCreateTmpFolder(adapter);
  const files = await listFiles(adapter, tmpFolderId);

  const result = createResult();
  for (const file of files) {
    if (!file.id) continue;

    try {
      await adapter.drive.files.update({
        fileId: file.id,
        addParents: adapter.folderId,
        removeParents: tmpFolderId,
      });
      result.succeeded.push(file.id);
    } catch (err) {
      console.error(`Failed to revive file ${file.id}:`, err);
      result.failed.push(toFailure(file.id, err));
    }
  }

  return result;
};

export const GoogleDriveAdapter = (
  credentials: string,
  folderId: string
): DriveAdapter => {
  const parsedCredentials = JSON.parse(credentials) as GoogleCredentials;
  const auth = new google.auth.JWT({
    email: parsedCredentials.client_email,
    key: parsedCredentials.private_key.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  const adapter: GoogleDriveAdapter = {
    drive: google.drive({ version: "v3", auth }),
    folderId,
  };

  return {
    getTargetPaths: () => getTargetPaths(adapter),
    getAssetLinks: (fileIds: string[]) => getAssetLinks(adapter, fileIds),
    evacuateRelearnedFiles: (fileIds: string[]) =>
      evacuateRelearnedFiles(adapter, fileIds),
    reviveSharedFiles: () => reviveSharedFiles(adapter),
  } satisfies DriveAdapter;
};

export default GoogleDriveAdapter;

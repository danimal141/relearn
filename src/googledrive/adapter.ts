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

export const TARGET_FILE_LIMIT = 3;
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

export class GoogleDriveAdapter implements DriveAdapter {
  private readonly drive: drive_v3.Drive;
  private readonly folderId: string;

  constructor(credentials: string, folderId: string) {
    const parsedCredentials = JSON.parse(credentials) as GoogleCredentials;
    const auth = new google.auth.JWT({
      email: parsedCredentials.client_email,
      key: parsedCredentials.private_key.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    this.drive = google.drive({ version: "v3", auth });
    this.folderId = folderId;
  }

  async getTargetPaths(): Promise<string[]> {
    const files = await this.listFiles(this.folderId);
    if (files.length === 0) return [];

    const imageFiles = files.filter((file) =>
      IMAGE_MIME_TYPE_SET.has(file.mimeType ?? "")
    );

    return take(
      shuffle(imageFiles.map((file) => file.id)),
      TARGET_FILE_LIMIT
    ).filter((id): id is string => id != null);
  }

  async getAssetLinks(fileIds: string[]): Promise<string[]> {
    const links = await Promise.all(
      fileIds.map(async (fileId) => {
        try {
          const permissions = await this.drive.permissions.list({
            fileId,
            fields: "permissions(id, type)",
          });

          const isPublic = permissions.data.permissions?.some(
            (permission) => permission.type === "anyone"
          );

          if (!isPublic) {
            await this.drive.permissions.create({
              fileId,
              requestBody: {
                role: "reader",
                type: "anyone",
              },
            });
          }

          return `https://drive.usercontent.google.com/download?id=${fileId}&export=view&authuser=0`;
        } catch (err) {
          console.error(`Failed to create link for ${fileId}:`, err);
          return null;
        }
      })
    );

    return links.filter((link): link is string => link != null);
  }

  async evacuateRelearnedFiles(
    fileIds: string[]
  ): Promise<DriveOperationResult> {
    const tmpFolderId = await this.getOrCreateTmpFolder();
    const result = GoogleDriveAdapter.createResult();

    for (const fileId of fileIds) {
      try {
        await this.drive.files.update({
          fileId,
          addParents: tmpFolderId,
          removeParents: this.folderId,
        });
        result.succeeded.push(fileId);
      } catch (err) {
        console.error(`Failed to move file ${fileId}:`, err);
        result.failed.push(GoogleDriveAdapter.toFailure(fileId, err));
      }
    }

    return result;
  }

  async reviveSharedFiles(): Promise<DriveOperationResult> {
    const tmpFolderId = await this.getOrCreateTmpFolder();
    const files = await this.listFiles(tmpFolderId);
    const result = GoogleDriveAdapter.createResult();

    for (const file of files) {
      if (!file.id) continue;

      try {
        await this.drive.files.update({
          fileId: file.id,
          addParents: this.folderId,
          removeParents: tmpFolderId,
        });
        result.succeeded.push(file.id);
      } catch (err) {
        console.error(`Failed to revive file ${file.id}:`, err);
        result.failed.push(GoogleDriveAdapter.toFailure(file.id, err));
      }
    }

    return result;
  }

  private async listFiles(
    folderId: string,
    limit: number = ASSET_FILE_LIMIT
  ): Promise<drive_v3.Schema$File[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: limit,
        fields: "files(id, name, mimeType)",
      });
      return response.data.files || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  private async getOrCreateTmpFolder(): Promise<string> {
    const response = await this.drive.files.list({
      q: `'${this.folderId}' in parents and name = 'tmp' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
    });

    if (response.data.files && response.data.files.length > 0) {
      const folderId = response.data.files[0].id;
      if (!folderId) throw new Error("Failed to get tmp folder ID");
      return folderId;
    }

    const folder = await this.drive.files.create({
      requestBody: {
        name: "tmp",
        mimeType: "application/vnd.google-apps.folder",
        parents: [this.folderId],
      },
      fields: "id",
    });

    const folderId = folder.data.id;
    if (!folderId) throw new Error("Failed to create tmp folder");
    return folderId;
  }

  private static toFailure(id: string, error: unknown): DriveOperationFailure {
    return {
      id,
      reason: error instanceof Error ? error.message : String(error),
    };
  }

  private static createResult(): DriveOperationResult {
    return {
      succeeded: [],
      failed: [],
    };
  }
}

export default GoogleDriveAdapter;

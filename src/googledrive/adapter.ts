import { google, drive_v3 } from "googleapis";
import { shuffle, take } from "es-toolkit";

interface GoogleCredentials {
  client_email: string;
  private_key: string;
}

export default class GoogleDriveAdapter {
  static readonly TARGET_FILE_LIMIT = 1;
  static readonly ASSET_FILE_LIMIT = 100;
  static readonly IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
  ];

  private drive: drive_v3.Drive;
  private folderId: string;

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

  public async getTargetPaths(): Promise<string[]> {
    const files = await this.listFiles(this.folderId);
    if (files.length === 0) return [];

    const imageFiles = files.filter((file) =>
      GoogleDriveAdapter.IMAGE_MIME_TYPES.includes(file.mimeType || "")
    );

    return take(
      shuffle(imageFiles.map((file) => file.id)),
      GoogleDriveAdapter.TARGET_FILE_LIMIT
    ).filter((id): id is string => id != null);
  }

  public async getAssetLinks(fileIds: string[]): Promise<string[]> {
    const links = await Promise.all(
      fileIds.map(async (fileId) => {
        try {
          // Check if file is already shared
          const permissions = await this.drive.permissions.list({
            fileId: fileId,
            fields: "permissions(id, type)",
          });

          const isPublic = permissions.data.permissions?.some(
            (p) => p.type === "anyone"
          );

          if (!isPublic) {
            // Create public share permission
            await this.drive.permissions.create({
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
  }

  public async evacuateRelearnedFiles(fileIds: string[]): Promise<number> {
    const tmpFolderId = await this.getOrCreateTmpFolder();

    let successCount = 0;
    for (const fileId of fileIds) {
      try {
        await this.drive.files.update({
          fileId: fileId,
          addParents: tmpFolderId,
          removeParents: this.folderId,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to move file ${fileId}:`, err);
      }
    }

    return successCount;
  }

  public async reviveSharedFiles(): Promise<number> {
    const tmpFolderId = await this.getOrCreateTmpFolder();
    const files = await this.listFiles(tmpFolderId);

    let successCount = 0;
    for (const file of files) {
      if (!file.id) continue;

      try {
        await this.drive.files.update({
          fileId: file.id,
          addParents: this.folderId,
          removeParents: tmpFolderId,
        });
        successCount++;
      } catch (err) {
        console.error(`Failed to revive file ${file.id}:`, err);
      }
    }

    return successCount;
  }

  private async getOrCreateTmpFolder(): Promise<string> {
    // Check if tmp folder already exists
    const response = await this.drive.files.list({
      q: `'${this.folderId}' in parents and name = 'tmp' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      fields: "files(id)",
    });

    if (response.data.files && response.data.files.length > 0) {
      const folderId = response.data.files[0].id;
      if (!folderId) throw new Error("Failed to get tmp folder ID");
      return folderId;
    }

    // Create tmp folder
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

  private async listFiles(
    folderId: string,
    limit?: number
  ): Promise<drive_v3.Schema$File[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: limit || GoogleDriveAdapter.ASSET_FILE_LIMIT,
        fields: "files(id, name, mimeType)",
      });
      return response.data.files || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}

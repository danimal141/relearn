import { google, type drive_v3 } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

export default class GoogleDriveAdapter {
  private drive: drive_v3.Drive;
  private auth: OAuth2Client;

  constructor(serviceAccountKey: string) {
    // Parse service account key
    const credentials = JSON.parse(serviceAccountKey);

    // Create OAuth2 client with service account
    this.auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    }).fromJSON(credentials) as OAuth2Client;

    // Initialize Google Drive API
    this.drive = google.drive({ version: "v3", auth: this.auth });
  }

  /**
   * Get list of image files from specified folder
   */
  public async getImageFiles(folderId: string): Promise<drive_v3.Schema$File[]> {
    try {
      const response = await this.drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`,
        fields: "files(id, name, mimeType, webViewLink, webContentLink, createdTime)",
        pageSize: 1000,
      });

      return response.data.files || [];
    } catch (error) {
      console.error("Error fetching files from Google Drive:", error);
      return [];
    }
  }

  /**
   * Get random images from the folder
   */
  public async getRandomImages(folderId: string, count: number = 1): Promise<drive_v3.Schema$File[]> {
    const files = await this.getImageFiles(folderId);

    if (files.length === 0) {
      return [];
    }

    // Shuffle and take requested count
    const shuffled = [...files].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, files.length));
  }

  /**
   * Make file publicly accessible and get shareable link
   */
  public async createPublicLink(fileId: string): Promise<string | null> {
    try {
      // First, update the file permissions to make it public
      await this.drive.permissions.create({
        fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });

      // Get the file with the webViewLink
      const file = await this.drive.files.get({
        fileId,
        fields: "webViewLink, webContentLink",
      });

      // Return direct link for images (webContentLink)
      return file.data.webContentLink || file.data.webViewLink || null;
    } catch (error) {
      console.error(`Error creating public link for file ${fileId}:`, error);
      return null;
    }
  }

  /**
   * Get public links for multiple files
   */
  public async getPublicLinks(files: drive_v3.Schema$File[]): Promise<string[]> {
    const links: string[] = [];

    for (const file of files) {
      if (file.id) {
        const link = await this.createPublicLink(file.id);
        if (link) {
          links.push(link);
        }
      }
    }

    return links;
  }

  /**
   * Get image metadata
   */
  public async getImageMetadata(fileId: string): Promise<drive_v3.Schema$File | null> {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields: "id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink",
      });

      return response.data;
    } catch (error) {
      console.error(`Error fetching metadata for file ${fileId}:`, error);
      return null;
    }
  }
}

export interface DriveAdapter {
  getTargetPaths(): Promise<string[]>;
  getAssetLinks(fileIds: string[]): Promise<string[]>;
  evacuateRelearnedFiles(fileIds: string[]): Promise<number>;
  reviveSharedFiles(): Promise<number>;
}

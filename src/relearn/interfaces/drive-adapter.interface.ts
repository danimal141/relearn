export interface DriveOperationFailure {
  readonly id: string;
  readonly reason: string;
}

export interface DriveOperationResult {
  readonly succeeded: string[];
  readonly failed: DriveOperationFailure[];
}

export interface DriveAdapter {
  getTargetPaths(): Promise<string[]>;
  getAssetLinks(fileIds: string[]): Promise<string[]>;
  evacuateRelearnedFiles(fileIds: string[]): Promise<DriveOperationResult>;
  reviveSharedFiles(): Promise<DriveOperationResult>;
}

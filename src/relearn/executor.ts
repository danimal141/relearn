import {
  DriveAdapter,
  DriveOperationResult,
} from "./interfaces/drive-adapter.interface";
import { MessageAdapter } from "./interfaces/message-adapter.interface";

export type RelearnResult =
  | {
      readonly kind: "revived";
      readonly revived: DriveOperationResult;
    }
  | {
      readonly kind: "relearned";
      readonly linksShared: number;
      readonly evacuated: DriveOperationResult;
    };

export interface ExecutorService {
  relearn(): Promise<RelearnResult>;
}

export class Executor implements ExecutorService {
  constructor(
    private readonly driveAdapter: DriveAdapter,
    private readonly slackAdapter: MessageAdapter
  ) {}

  async relearn(): Promise<RelearnResult> {
    const paths = await this.driveAdapter.getTargetPaths();
    if (paths.length === 0) {
      // There is no target which we can relearn
      // Revive assets
      const reviveResult = await this.driveAdapter.reviveSharedFiles();
      // Try relearning next time
      return {
        kind: "revived",
        revived: reviveResult,
      };
    }

    const links = await this.driveAdapter.getAssetLinks(paths);

    // Send shared links to Slack
    for (const link of links) {
      await this.slackAdapter.send(link);
    }

    // Evacuate the shared files
    const evacuated = await this.driveAdapter.evacuateRelearnedFiles(paths);
    return {
      kind: "relearned",
      linksShared: links.length,
      evacuated,
    };
  }
}

export default Executor;

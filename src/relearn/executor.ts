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

interface ExecutorService {
  relearn(): Promise<RelearnResult>;
}

type Executor = {
  readonly driveAdapter: DriveAdapter;
  readonly slackAdapter: MessageAdapter;
};

const relearn = async (executor: Executor): Promise<RelearnResult> => {
  const paths = await executor.driveAdapter.getTargetPaths();
  if (paths.length === 0) {
    // There is no target which we can relearn
    // Revive assets
    const reviveResult = await executor.driveAdapter.reviveSharedFiles();
    // Try relearning next time
    return {
      kind: "revived",
      revived: reviveResult,
    };
  }

  const links = await executor.driveAdapter.getAssetLinks(paths);

  // Send shared links to Slack
  for (const link of links) {
    await executor.slackAdapter.send(link);
  }

  // Evacuate the shared files
  const evacuated = await executor.driveAdapter.evacuateRelearnedFiles(paths);
  return {
    kind: "relearned",
    linksShared: links.length,
    evacuated,
  };
};

export const Executor = (
  driveAdapter: DriveAdapter,
  slackAdapter: MessageAdapter
) => {
  const executor: Executor = { driveAdapter, slackAdapter };

  return {
    relearn: () => relearn(executor),
  } satisfies ExecutorService;
};

export default Executor;

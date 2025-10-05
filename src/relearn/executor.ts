import { DriveAdapter } from "./interfaces/drive-adapter.interface";
import { MessageAdapter } from "./interfaces/message-adapter.interface";

interface ExecutorService {
  relearn(): Promise<number>;
}

type Executor = {
  readonly driveAdapter: DriveAdapter;
  readonly slackAdapter: MessageAdapter;
};

const relearn = async (executor: Executor): Promise<number> => {
  const paths = await executor.driveAdapter.getTargetPaths();
  if (paths.length === 0) {
    // There is no target which we can relearn
    // Revive assets
    const status = await executor.driveAdapter.reviveSharedFiles();
    // Try relearning next time
    return status;
  }

  const links = await executor.driveAdapter.getAssetLinks(paths);

  // Send shared links to Slack
  for await (const link of links) {
    await executor.slackAdapter.send(link);
  }

  // Evacuate the shared files
  const status = await executor.driveAdapter.evacuateRelearnedFiles(paths);
  return status;
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

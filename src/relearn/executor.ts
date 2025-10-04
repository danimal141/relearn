import { DriveAdapter } from "./interfaces/drive-adapter.interface";
import { MessageAdapter } from "./interfaces/message-adapter.interface";

type Executor = {
  driveAdapter: DriveAdapter;
  slackAdapter: MessageAdapter;
};

const relearn = async (self: Executor): Promise<number> => {
  const paths = await self.driveAdapter.getTargetPaths();
  if (paths.length === 0) {
    // There is no target which we can relearn
    // Revive assets
    const status = await self.driveAdapter.reviveSharedFiles();
    // Try relearning next time
    return status;
  }

  const links = await self.driveAdapter.getAssetLinks(paths);

  // Send shared links to Slack
  for await (const link of links) {
    await self.slackAdapter.send(link);
  }

  // Evacuate the shared files
  const status = await self.driveAdapter.evacuateRelearnedFiles(paths);
  return status;
};

export const createExecutor = (
  driveAdapter: DriveAdapter,
  slackAdapter: MessageAdapter
) => {
  const self: Executor = { driveAdapter, slackAdapter };

  return {
    relearn: () => relearn(self),
  };
};

export default createExecutor;

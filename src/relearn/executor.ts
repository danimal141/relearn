import GoogleDriveAdapter from "../googledrive/adapter";
import SlackAdapter from "../slack/adapter";

export default class Executor {
  private driveAdapter: GoogleDriveAdapter;
  private slackAdapter: SlackAdapter;

  constructor(driveAdapter: GoogleDriveAdapter, slackAdapter: SlackAdapter) {
    this.driveAdapter = driveAdapter;
    this.slackAdapter = slackAdapter;
  }

  public async relearn(): Promise<number> {
    const paths = await this.driveAdapter.getTargetPaths();
    if (paths.length === 0) {
      // There is no target which we can relearn
      // Revive assets
      const status = await this.driveAdapter.reviveSharedFiles();
      // Try relearning next time
      return status;
    }

    const links = await this.driveAdapter.getAssetLinks(paths);

    // Send shared links to Slack
    for await (const link of links) {
      await this.slackAdapter.send(link);
    }

    // Evacuate the shared files
    const status = await this.driveAdapter.evacuateRelearnedFiles(paths);
    return status;
  }
}

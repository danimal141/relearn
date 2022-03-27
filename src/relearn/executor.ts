import DbxAdapter from "../dropbox/adapter";
import SlackAdapter from "../slack/adapter";

export default class Executor {
  private dbxAdapter: DbxAdapter;
  private slackAdapter: SlackAdapter;

  constructor(dbxAdapter: DbxAdapter, slackAdapter: SlackAdapter) {
    this.dbxAdapter = dbxAdapter;
    this.slackAdapter = slackAdapter;
  }

  public async relearn(): Promise<number> {
    const paths = await this.dbxAdapter.getTargetPaths();
    if (paths.length === 0) {
      // There is no target which we can relearn
      // Revive assets
      const status = await this.dbxAdapter.reviveSharedFiles();
      // Try relearning next time
      return status;
    }

    const links = await this.dbxAdapter.getSharedLinks(paths);

    // Send shared links to Slack
    for await (const link of links) {
      await this.slackAdapter.send(link);
    }

    // Evacuate the shared files
    const status = await this.dbxAdapter.evacuateRelearnedFiles(paths);
    return status;
  }
}

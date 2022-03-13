import { Dropbox } from "dropbox";
import { compact, shuffle, take } from "lodash";

export default class DbxAdapter {
  static readonly DBX_TARGET_FILE_LIMIT = 50;
  static readonly DBX_RELEARN_FILE_LIMIT = 10;

  client: Dropbox;

  constructor(client: Dropbox) {
    this.client = client;
  }

  public async getSharedLinks(): Promise<string[]> {
    const paths = await this.listFilePaths();
    const targets = take(shuffle(paths), DbxAdapter.DBX_RELEARN_FILE_LIMIT);
    const links = await Promise.all(
      targets.map(async (path) => {
        const resp = await this.client.sharingListSharedLinks({ path: path });
        const link = resp.result.links[0];
        if (link == null) {
          // Create a link to share newly
          const created = await this.client.sharingCreateSharedLinkWithSettings(
            { path: path }
          );
          return created.result.url;
        } else {
          return link.url;
        }
      })
    );
    return links;
  }

  private async listFilePaths(): Promise<string[]> {
    try {
      const resp = await this.client.filesListFolder({
        path: process.env.DBX_TARGET_PATH || "",
        limit: DbxAdapter.DBX_TARGET_FILE_LIMIT,
      });
      return compact(resp.result.entries.map((entry) => entry.path_display));
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}

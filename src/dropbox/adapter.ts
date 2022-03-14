import { Dropbox } from "dropbox";
import { compact, shuffle, take } from "lodash";

export default class DbxAdapter {
  static readonly TARGET_FILE_LIMIT = 50;
  static readonly RELEARN_FILE_LIMIT = 10;

  client: Dropbox;
  path: string;

  constructor(client: Dropbox, path: string) {
    this.client = client;
    this.path = path;
  }

  public async getSharedLinks(): Promise<string[]> {
    const paths = await this.listFilePaths();
    const targets = take(shuffle(paths), DbxAdapter.RELEARN_FILE_LIMIT);
    const links = await Promise.all(
      targets.map(async (path) => {
        const resp = await this.client.sharingListSharedLinks({ path: path });
        const link = resp.result.links[0];
        if (link != null) return link.url;
        // Create a link to share newly
        const created = await this.client.sharingCreateSharedLinkWithSettings({
          path: path,
        });
        return created.result.url;
      })
    );
    return links;
  }

  private async listFilePaths(): Promise<string[]> {
    try {
      const resp = await this.client.filesListFolder({
        path: this.path,
        limit: DbxAdapter.TARGET_FILE_LIMIT,
      });
      return compact(resp.result.entries.map((entry) => entry.path_display));
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}

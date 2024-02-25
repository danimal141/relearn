// import { async, Dropbox, files } from "dropbox";
import { Dropbox, files } from "dropbox";
import { compact, shuffle, take } from "lodash";

export default class DbxAdapter {
  static readonly TARGET_FILE_LIMIT = 5;
  static readonly ASSET_FILE_LIMIT = 100;
  static readonly REVIVE_FILE_LIMIT = 100;
  // static readonly DL_DROPBOX_URL_BASE = "https://dl.dropboxusercontent.com";

  private client: Dropbox;
  private rootPath: string;
  private tmpPath: string;

  constructor(client: Dropbox, path: string) {
    this.client = client;
    this.rootPath = path;
    this.tmpPath = `${path}/tmp`;
  }

  public async getAssetLinks(paths: string[]): Promise<string[]> {
    const links = await Promise.all(
      paths.map(async (path) => {
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
    // return compact(links).map((link) => {
    //   const path = new URL(link).pathname;
    //   // convert the direct link
    //   // "www.dropbox.com" -> "dl.dropboxusercontent.com" / strip "?dl=0"
    //   return DbxAdapter.DL_DROPBOX_URL_BASE + path;
    // });
  }

  public async evacuateRelearnedFiles(paths: string[]): Promise<number> {
    // root path => tmp path
    const entries = paths.map((path) => {
      return {
        from_path: path,
        to_path: path.replace(this.rootPath, this.tmpPath),
      };
    });
    return this.moveFilesBatch(entries);
  }

  public async getTargetPaths(): Promise<string[]> {
    const paths = await this.listFilePaths();
    if (this.isTargetEmpty(paths)) return [];

    return take(shuffle(paths), DbxAdapter.TARGET_FILE_LIMIT);
  }

  public async reviveSharedFiles(): Promise<number> {
    const paths = await this.listFilePaths(
      this.tmpPath,
      DbxAdapter.REVIVE_FILE_LIMIT
    );

    // tmp path => root path
    const entries = paths.map((path) => {
      return {
        from_path: path,
        to_path: path.replace(this.tmpPath, this.rootPath),
      };
    });
    return this.moveFilesBatch(entries);
  }

  private async listFilePaths(
    path?: string,
    limit?: number
  ): Promise<string[]> {
    try {
      const resp = await this.client.filesListFolder({
        path: path || this.rootPath,
        limit: limit || DbxAdapter.ASSET_FILE_LIMIT,
      });
      const paths = compact(
        resp.result.entries.map((entry) =>
          entry[".tag"] === "file" ? entry.path_display : null
        )
      );
      return paths;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  private async moveFilesBatch(
    entries: files.RelocationPath[]
  ): Promise<number> {
    const resp = await this.client.filesMoveBatchV2({
      entries: entries,
    });
    return resp.status;

    // Debug
    // if (resp.result['.tag'] === 'async_job_id') {
    //   const jobId = (resp.result as async.LaunchResultBaseAsyncJobId).async_job_id
    //   const jobResp = await this.client.filesMoveBatchCheckV2({ async_job_id: jobId })
    //   console.log(jobResp)
    // }
  }

  private isTargetEmpty(paths: string[]): boolean {
    return paths.length === 1 && paths[0] === this.tmpPath;
  }
}

// import { async, Dropbox, files } from "dropbox";
import { Dropbox, files } from "dropbox";
import { compact, shuffle, take } from "lodash";

export default class DbxAdapter {
  static readonly RELEARN_FILE_LIMIT = 5;
  static readonly TARGET_FILE_LIMIT = 100;
  static readonly REVIVE_FILE_LIMIT = 100;

  private client: Dropbox;
  private rootPath: string;
  private tmpPath: string;

  constructor(client: Dropbox, path: string) {
    this.client = client;
    this.rootPath = path;
    this.tmpPath = `${path}/tmp`;
  }

  public async getSharedLinks(paths: string[]): Promise<string[]> {
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
  }

  public async evacuateSharedFiles(paths: string[]) {
    const entries = paths.map((path) => {
      return {
        from_path: path,
        to_path: path.replace(this.rootPath, this.tmpPath),
      };
    });
    this.moveBatch(entries);
  }

  public async getTargetPaths(): Promise<string[]> {
    const entries = await this.listFileEntries();
    return this.getPaths(entries, DbxAdapter.TARGET_FILE_LIMIT);
  }

  public async reviveSharedFiles() {
    const tmpEntries = await this.listFileEntries(
      this.tmpPath,
      DbxAdapter.REVIVE_FILE_LIMIT
    );
    const paths = await this.getPaths(tmpEntries, DbxAdapter.REVIVE_FILE_LIMIT);
    if (paths.length === 0) return;

    const entries = paths.map((path) => {
      return {
        from_path: path,
        to_path: path.replace(this.tmpPath, this.rootPath),
      };
    });
    this.moveBatch(entries);
  }

  private async getPaths(
    entries: Array<
      | files.FileMetadataReference
      | files.FolderMetadataReference
      | files.DeletedMetadataReference
    >,
    limit: number
  ): Promise<string[]> {
    const paths = compact(entries.map((entry) => entry.path_display));
    return take(shuffle(paths), limit);
  }

  private async moveBatch(entries: files.RelocationPath[]) {
    const resp = await this.client.filesMoveBatchV2({
      entries: entries,
    });
    // Debug
    // if (resp.result['.tag'] === 'async_job_id') {
    //   const jobId = (resp.result as async.LaunchResultBaseAsyncJobId).async_job_id
    //   const jobResp = await this.client.filesMoveBatchCheckV2({ async_job_id: jobId })
    //   console.log(jobResp)
    // }
  }

  private async listFileEntries(
    path?: string,
    limit?: number
  ): Promise<
    Array<
      | files.FileMetadataReference
      | files.FolderMetadataReference
      | files.DeletedMetadataReference
    >
  > {
    try {
      const resp = await this.client.filesListFolder({
        path: path || this.rootPath,
        limit: limit || DbxAdapter.TARGET_FILE_LIMIT,
      });
      return resp.result.entries;
    } catch (err) {
      console.error(err);
      return [];
    }
  }
}

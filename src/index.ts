import { Dropbox } from "dropbox";
import DbxAdapter from "./dropbox/adapter";

(async () => {
  const client = new Dropbox({ accessToken: process.env.DBX_ACCESS_TOKEN });
  const path = process.env.DBX_TARGET_PATH || "";
  const adapter = new DbxAdapter(client, path);

  const links = await adapter.getSharedLinks();
  console.log(links);
})();

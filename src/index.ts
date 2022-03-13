import { Dropbox } from "dropbox";
import DbxAdapter from "./dropbox/adapter";

(async () => {
  const client = new Dropbox({ accessToken: process.env.DBX_ACCESS_TOKEN });
  const adapter = new DbxAdapter(client);

  const links = await adapter.getSharedLinks();
  console.log(links);
})();

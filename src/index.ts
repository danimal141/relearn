import { Dropbox } from "dropbox";
import DbxAdapter from "./dropbox/adapter";

(async () => {
  const client = new Dropbox({
    refreshToken: process.env.DBX_REFRESH_TOKEN,
    clientId: process.env.DBX_CLIENT_ID,
    clientSecret: process.env.DBX_CLIENT_SECRET,
  });
  const path = process.env.DBX_TARGET_PATH || "";
  const adapter = new DbxAdapter(client, path);

  const links = await adapter.getSharedLinks();
  console.log(links);
})();

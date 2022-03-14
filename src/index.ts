import { Dropbox } from "dropbox";

import DbxAdapter from "./dropbox/adapter";
import SlackSender from "./slack/sender";

(async () => {
  if (process.env.SLACK_WEBHOOK_URL == null) {
    throw "SLACK_WEBHOOK_URL must be set";
  }
  const sender = new SlackSender(process.env.SLACK_WEBHOOK_URL);

  const dbxClient = new Dropbox({
    refreshToken: process.env.DBX_REFRESH_TOKEN,
    clientId: process.env.DBX_CLIENT_ID,
    clientSecret: process.env.DBX_CLIENT_SECRET,
  });
  const path = process.env.DBX_TARGET_PATH || "";
  const adapter = new DbxAdapter(dbxClient, path);
  const links = await adapter.getSharedLinks();

  links.forEach(async (link) => {
    console.log(`sending ${link}`);

    await sender.send(link);
  });
})();

import { Dropbox } from "dropbox";

import DbxAdapter from "./dropbox/adapter";
import SlackAdapter from "./slack/adapter";

(async () => {
  if (process.env.SLACK_WEBHOOK_URL == null) {
    throw "SLACK_WEBHOOK_URL must be set";
  }
  const slackAdapter = new SlackAdapter(process.env.SLACK_WEBHOOK_URL);

  const dbxClient = new Dropbox({
    refreshToken: process.env.DBX_REFRESH_TOKEN,
    clientId: process.env.DBX_CLIENT_ID,
    clientSecret: process.env.DBX_CLIENT_SECRET,
  });
  const path = process.env.DBX_TARGET_PATH || "";
  const dbxAdapter = new DbxAdapter(dbxClient, path);
  const links = await dbxAdapter.getSharedLinks();

  links.forEach(async (link) => {
    await slackAdapter.send(link);
  });
})();

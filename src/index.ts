import { Dropbox } from "dropbox";

import DbxAdapter from "./dropbox/adapter";
import SlackAdapter from "./slack/adapter";

(async () => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const dbxRefreshToken = process.env.DBX_REFRESH_TOKEN;
  const dbxClientId = process.env.DBX_CLIENT_ID;
  const dbxClientSecret = process.env.DBX_CLIENT_SECRET;

  if (
    webhookUrl == null ||
    dbxRefreshToken == null ||
    dbxClientId == null ||
    dbxClientSecret == null
  ) {
    throw "some required environment variables may not be set";
  }

  const slackAdapter = new SlackAdapter(webhookUrl);
  const dbxClient = new Dropbox({
    refreshToken: dbxRefreshToken,
    clientId: dbxClientId,
    clientSecret: dbxClientSecret,
  });
  const dbxAdapter = new DbxAdapter(
    dbxClient,
    process.env.DBX_TARGET_PATH || ""
  );
  const paths = await dbxAdapter.getTargetPaths();

  if (paths.length === 0) {
    // There is no target which I can relearn
    // Revive assets
    await dbxAdapter.reviveSharedFiles();
    return;
  }

  const links = await dbxAdapter.getSharedLinks(paths);

  // Send shared links to Slack
  links.forEach(async (link) => {
    await slackAdapter.send(link);
  });

  // Evacuate the shared files
  await dbxAdapter.evacuateSharedFiles(paths);
})();

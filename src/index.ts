import { Dropbox } from "dropbox";

import DbxAdapter from "./dropbox/adapter";
import SlackAdapter from "./slack/adapter";
import Executor from "./relearn/executor";

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

  const executor = new Executor(dbxAdapter, slackAdapter);

  const status = await executor.relearn();
  console.log(status);
})();

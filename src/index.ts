import createGoogleDriveAdapter from "./googledrive/adapter";
import createSlackAdapter from "./slack/adapter";
import createExecutor from "./relearn/executor";

void (async () => {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  const googleDriveCredentials = process.env.GOOGLE_DRIVE_CREDENTIALS;
  const googleDriveFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (webhookUrl == null) {
    throw "SLACK_WEBHOOK_URL is not set";
  }

  if (googleDriveCredentials == null || googleDriveFolderId == null) {
    throw "GOOGLE_DRIVE_CREDENTIALS and GOOGLE_DRIVE_FOLDER_ID must be set";
  }

  const slackAdapter = createSlackAdapter(webhookUrl);
  const googleDriveAdapter = createGoogleDriveAdapter(
    googleDriveCredentials.replace(/\n/g, "\\n"),
    googleDriveFolderId
  );

  const executor = createExecutor(googleDriveAdapter, slackAdapter);

  const status = await executor.relearn();
  console.log(status);
})();

import { GoogleDriveAdapter } from "./googledrive/adapter";
import { SlackAdapter } from "./slack/adapter";
import { Executor } from "./relearn/executor";

void (async () => {
  const requireEnv = (key: string): string => {
    const value = process.env[key]?.trim();
    if (!value) {
      throw new Error(`${key} is not set`);
    }
    return value;
  };

  const webhookUrl = requireEnv("SLACK_WEBHOOK_URL");
  const googleDriveCredentials = requireEnv("GOOGLE_DRIVE_CREDENTIALS");
  const googleDriveFolderId = requireEnv("GOOGLE_DRIVE_FOLDER_ID");

  const slackAdapter = SlackAdapter(webhookUrl);
  const googleDriveAdapter = GoogleDriveAdapter(
    googleDriveCredentials.replace(/\n/g, "\\n"),
    googleDriveFolderId
  );

  const executor = Executor(googleDriveAdapter, slackAdapter);

  const status = await executor.relearn();
  console.log(status);
})();

import Executor from "./relearn/executor";
import SlackAdapter from "./slack/adapter";

(async () => {
  const webhookUrl = process.env["SLACK_WEBHOOK_URL"];

  if (webhookUrl == null) {
    throw "SLACK_WEBHOOK_URL environment variable is not set";
  }

  const slackAdapter = new SlackAdapter(webhookUrl);
  const executor = new Executor(slackAdapter);

  const status = await executor.relearn();
  console.log(status);
})();

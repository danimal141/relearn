import type SlackAdapter from "../slack/adapter";

export default class Executor {
  private slackAdapter: SlackAdapter;

  constructor(slackAdapter: SlackAdapter) {
    this.slackAdapter = slackAdapter;
  }

  public async relearn(): Promise<number> {
    // Send a test message to Slack
    const message = "Hello from relearn v2! 🚀";
    await this.slackAdapter.send(message);

    console.log("Message sent successfully");
    return 1;
  }
}

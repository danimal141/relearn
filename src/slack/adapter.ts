import { IncomingWebhook } from "@slack/webhook";
import { MessageAdapter } from "../relearn/interfaces/message-adapter.interface";

export class SlackAdapter implements MessageAdapter {
  private readonly hook: IncomingWebhook;

  constructor(url: string) {
    this.hook = new IncomingWebhook(url);
  }

  async send(message: string): Promise<void> {
    // Reference: https://api.slack.com/reference/messaging/link-unfurling#configure_scopes
    await this.hook.send({
      text: `<${message}>`,
      unfurl_links: true, // To show the preview
    });
  }
}

export default SlackAdapter;

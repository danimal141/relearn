import { IncomingWebhook, IncomingWebhookResult } from "@slack/webhook";
import { MessageAdapter } from "../relearn/interfaces/message-adapter.interface";

export default class SlackAdapter implements MessageAdapter {
  private hook: IncomingWebhook;

  constructor(url: string) {
    this.hook = new IncomingWebhook(url);
  }

  public async send(message: string): Promise<IncomingWebhookResult> {
    // Reference: https://api.slack.com/reference/messaging/link-unfurling#configure_scopes
    return this.hook.send({
      text: `<${message}>`,
      unfurl_links: true, // To show the preview
    });
  }
}

import { IncomingWebhook, type IncomingWebhookResult } from "@slack/webhook";

export default class SlackAdapter {
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

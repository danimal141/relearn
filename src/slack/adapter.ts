import { IncomingWebhook, IncomingWebhookResult } from "@slack/webhook";

export default class SlackAdapter {
  private hook: IncomingWebhook;

  constructor(url: string) {
    this.hook = new IncomingWebhook(url);
  }

  public async send(message: string): Promise<IncomingWebhookResult> {
    return this.hook.send(message);
  }
}

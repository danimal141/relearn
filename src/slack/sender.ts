import { IncomingWebhook, IncomingWebhookResult } from "@slack/webhook";

export default class SlackSender {
  url: string;
  hook: IncomingWebhook;

  constructor(url: string) {
    this.url = url;
    this.hook = new IncomingWebhook(url);
  }

  public async send(message: string): Promise<IncomingWebhookResult> {
    return this.hook.send(message);
  }
}

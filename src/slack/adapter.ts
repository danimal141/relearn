import { IncomingWebhook, IncomingWebhookResult } from "@slack/webhook";
import { MessageAdapter } from "../relearn/interfaces/message-adapter.interface";

type SlackAdapter = {
  hook: IncomingWebhook;
};

const send = async (
  self: SlackAdapter,
  message: string
): Promise<IncomingWebhookResult> => {
  // Reference: https://api.slack.com/reference/messaging/link-unfurling#configure_scopes
  return self.hook.send({
    text: `<${message}>`,
    unfurl_links: true, // To show the preview
  });
};

export const createSlackAdapter = (url: string): MessageAdapter => {
  const self: SlackAdapter = {
    hook: new IncomingWebhook(url),
  };

  return {
    send: (message: string) => send(self, message),
  };
};

export default createSlackAdapter;

import { IncomingWebhook } from "@slack/webhook";
import { MessageAdapter } from "../relearn/interfaces/message-adapter.interface";

type SlackAdapter = {
  readonly hook: IncomingWebhook;
};

const send = async (adapter: SlackAdapter, message: string): Promise<void> => {
  // Reference: https://api.slack.com/reference/messaging/link-unfurling#configure_scopes
  await adapter.hook.send({
    text: `<${message}>`,
    unfurl_links: true, // To show the preview
  });
};

export const SlackAdapter = (url: string): MessageAdapter => {
  const adapter: SlackAdapter = {
    hook: new IncomingWebhook(url),
  };

  return {
    send: (message: string) => send(adapter, message),
  } satisfies MessageAdapter;
};

export default SlackAdapter;

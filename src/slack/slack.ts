import { IncomingWebhook } from "@slack/webhook";
import type { AsyncResult } from "../types";
import type { SlackResult, SlackWebhook } from "./types";

// Webhook creation
export const createWebhook = (url: string): AsyncResult<SlackWebhook> => {
  try {
    const webhook = new IncomingWebhook(url);
    return Promise.resolve({ success: true, data: webhook });
  } catch (error) {
    return Promise.resolve({
      success: false,
      error: {
        type: "SlackError",
        message: `Failed to create Slack webhook: ${String(error)}`,
      },
    });
  }
};

// Message sending
export const sendMessage = async (
  webhook: SlackWebhook,
  message: string
): AsyncResult<SlackResult> => {
  try {
    const result = await webhook.send({
      text: `<${message}>`,
      unfurl_links: true,
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "SlackError",
        message: `Failed to send message: ${String(error)}`,
      },
    };
  }
};

// Batch message sending
export const sendMessages = async (
  webhook: SlackWebhook,
  messages: readonly string[]
): AsyncResult<readonly SlackResult[]> => {
  if (messages.length === 0) {
    return { success: true, data: [] };
  }

  try {
    const messagePromises = messages.map((msg) => sendMessage(webhook, msg));
    const messageResults = await Promise.all(messagePromises);

    const successfulResults: SlackResult[] = [];
    const errors: string[] = [];

    for (const result of messageResults) {
      if (result.success) {
        successfulResults.push(result.data);
      } else {
        errors.push(result.error.message);
      }
    }

    // If any messages were sent successfully, return them
    if (successfulResults.length > 0) {
      return { success: true, data: successfulResults };
    }

    // If no messages were sent, return error
    return {
      success: false,
      error: {
        type: "SlackError",
        message: `Failed to send any messages: ${errors.join(", ")}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "SlackError",
        message: `Failed to send messages: ${String(error)}`,
      },
    };
  }
};

// Message formatting utilities
export const formatImageMessage = (
  imageLink: string,
  fileName?: string,
  createdTime?: string
): string => {
  const parts = [imageLink];

  if (fileName) {
    parts.push(`📸 ${fileName}`);
  }

  if (createdTime) {
    const date = new Date(createdTime).toLocaleDateString("ja-JP");
    parts.push(`📅 ${date}`);
  }

  return parts.join(" ");
};

export const formatBatchMessage = (
  imageLinks: readonly string[],
  summary = "Daily relearn images"
): readonly string[] => {
  if (imageLinks.length === 0) {
    return [`${summary}: No images found today 😔`];
  }

  const headerMessage = `${summary} (${imageLinks.length} images) 🚀`;
  const imageMessages = imageLinks.map((link) => formatImageMessage(link));

  return [headerMessage, ...imageMessages];
};

// Helper for single image notification
export const sendImageNotification = async (
  webhookUrl: string,
  imageLink: string,
  fileName?: string,
  createdTime?: string
): AsyncResult<SlackResult> => {
  const webhookResult = await createWebhook(webhookUrl);

  if (!webhookResult.success) {
    return webhookResult;
  }

  const message = formatImageMessage(imageLink, fileName, createdTime);
  return sendMessage(webhookResult.data, message);
};

// Helper for batch image notification
export const sendBatchImageNotification = async (
  webhookUrl: string,
  imageLinks: readonly string[],
  summary?: string
): AsyncResult<readonly SlackResult[]> => {
  const webhookResult = await createWebhook(webhookUrl);

  if (!webhookResult.success) {
    return webhookResult;
  }

  const messages = formatBatchMessage(imageLinks, summary);
  return sendMessages(webhookResult.data, messages);
};

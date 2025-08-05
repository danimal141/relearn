import type { DriveFile } from "../googledrive/types";
import type { SlackResult } from "../slack/types";

// Result types
export type ImageResult = {
  readonly files: readonly DriveFile[];
  readonly links: readonly string[];
};

export type RelearnResult = {
  readonly images: ImageResult;
  readonly slackResults: readonly SlackResult[];
  readonly ocrResults:
    | readonly {
        readonly processedImageId: string;
        readonly postId: string;
        readonly content: string;
        readonly fileLink: string;
      }[]
    | undefined;
  readonly status: "success" | "partial" | "failed";
};

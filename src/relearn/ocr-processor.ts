import type { drive_v3 } from "googleapis";
import type { PrismaD1Client } from "../cloudflare/d1/prisma";
import { insertPostPrisma, insertProcessedImagePrisma } from "../cloudflare/d1/prisma";
import { getFileLink } from "../googledrive/googledrive";
import type { DriveFile } from "../googledrive/types";
import { createGeminiClient } from "../llm/client";
import { extractTextFromImage } from "../llm/ocr";
import type { AsyncResult } from "../types";

interface ProcessImageWithOcrParams {
  driveClient: drive_v3.Drive;
  prismaClient: PrismaD1Client;
  geminiApiKey: string;
  file: DriveFile;
}

interface ProcessImageWithOcrResult {
  processedImageId: string;
  postId: string;
  content: string;
  fileLink: string;
}

export const processImageWithOcr = async (
  params: ProcessImageWithOcrParams
): AsyncResult<ProcessImageWithOcrResult> => {
  const { driveClient, prismaClient, geminiApiKey, file } = params;

  try {
    // Generate unique IDs
    const processedImageId = crypto.randomUUID();
    const postId = crypto.randomUUID();

    // Get file link
    const fileId = file.id;
    if (!fileId) {
      return {
        success: false,
        error: {
          type: "ProcessingError",
          message: "File ID is missing",
        },
      };
    }
    const fileLinkResult = await getFileLink(driveClient, fileId);
    if (!fileLinkResult.success) {
      return {
        success: false,
        error: {
          type: "ProcessingError",
          message: `Failed to get file link: ${fileLinkResult.error.message}`,
        },
      };
    }

    // Download image data
    const response = await driveClient.files.get(
      {
        fileId: fileId,
        alt: "media",
      },
      { responseType: "arraybuffer" }
    );

    const imageData = Buffer.from(response.data as ArrayBuffer);
    const mimeType = file.mimeType || "image/jpeg";

    // Initialize Gemini client
    const geminiClientResult = createGeminiClient({ apiKey: geminiApiKey });
    if (!geminiClientResult.success) {
      return {
        success: false,
        error: {
          type: "ProcessingError",
          message: `Failed to create Gemini client: ${geminiClientResult.error.message}`,
        },
      };
    }

    // Extract text using OCR
    const ocrResult = await extractTextFromImage(geminiClientResult.data, {
      imageData,
      mimeType,
      driveFileId: fileId,
    });

    if (!ocrResult.success) {
      return {
        success: false,
        error: {
          type: "ProcessingError",
          message: `OCR failed: ${ocrResult.error.message}`,
        },
      };
    }

    // Save to database - ProcessedImage
    const insertImageResult = await insertProcessedImagePrisma(prismaClient, {
      id: processedImageId,
      fileName: file.name || "unknown",
      driveFileId: fileId,
      processedAt: new Date(),
      movedToSaved: false,
    });

    if (!insertImageResult.success) {
      return {
        success: false,
        error: {
          type: "ProcessingError",
          message: `Failed to insert processed image: ${insertImageResult.error.message}`,
        },
      };
    }

    // Save to database - Post
    const insertPostResult = await insertPostPrisma(prismaClient, {
      id: postId,
      processedImageId,
      content: ocrResult.data.text,
      ocrCachedAt: ocrResult.data.extractedAt,
      characterCount: ocrResult.data.text.length,
    });

    if (!insertPostResult.success) {
      return {
        success: false,
        error: {
          type: "ProcessingError",
          message: `Failed to insert post: ${insertPostResult.error.message}`,
        },
      };
    }

    return {
      success: true,
      data: {
        processedImageId,
        postId,
        content: ocrResult.data.text,
        fileLink: fileLinkResult.data,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "ProcessingError",
        message: `Failed to process image with OCR: ${String(error)}`,
      },
    };
  }
};

interface ProcessMultipleImagesWithOcrParams {
  driveClient: drive_v3.Drive;
  prismaClient: PrismaD1Client;
  geminiApiKey: string;
  files: readonly DriveFile[];
  maxConcurrent?: number;
}

export const processMultipleImagesWithOcr = async (
  params: ProcessMultipleImagesWithOcrParams
): AsyncResult<ProcessImageWithOcrResult[]> => {
  const { driveClient, prismaClient, geminiApiKey, files, maxConcurrent = 3 } = params;
  const results: ProcessImageWithOcrResult[] = [];
  const errors: string[] = [];

  // Process files in batches to avoid rate limits
  for (let i = 0; i < files.length; i += maxConcurrent) {
    const batch = files.slice(i, i + maxConcurrent);
    const batchPromises = batch.map((file) =>
      processImageWithOcr({
        driveClient,
        prismaClient,
        geminiApiKey,
        file,
      })
    );

    const batchResults = await Promise.all(batchPromises);

    for (const result of batchResults) {
      if (result.success) {
        results.push(result.data);
      } else {
        errors.push(result.error.message);
      }
    }

    // Add delay between batches to avoid rate limits
    if (i + maxConcurrent < files.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  if (results.length === 0 && errors.length > 0) {
    return {
      success: false,
      error: {
        type: "ProcessingError",
        message: `All images failed to process: ${errors.join("; ")}`,
      },
    };
  }

  return {
    success: true,
    data: results,
  };
};

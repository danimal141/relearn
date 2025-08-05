import { PrismaClient, type ProcessedImage } from '@prisma/client';
import { PrismaD1 } from '@prisma/adapter-d1';
import type { AsyncResult, AppError } from "../../types";
import type { D1Config } from "./types";

// Import Cloudflare Workers global types
/// <reference types="@cloudflare/workers-types" />

// Prisma client type
export type PrismaD1Client = PrismaClient;

// For Workers environment, create Prisma client with native D1 binding
export const createPrismaD1ClientFromBinding = (db: D1Database): PrismaD1Client => {
  const adapter = new PrismaD1(db);
  return new PrismaClient({ adapter });
};

// For HTTP environment, create Prisma client with HTTP-based D1 client (simplified)
export const createPrismaD1Client = async (config: D1Config): AsyncResult<PrismaD1Client> => {
  try {
    // Note: This is a simplified implementation for development/testing
    // In production, use the Workers environment with native D1 bindings
    const mockD1Client = {
      async exec(sql: string) {
        const response = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/d1/database/${config.databaseId}/query`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${config.apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql }),
          }
        );

        if (!response.ok) {
          throw new Error(`D1 query failed: ${response.statusText}`);
        }

        return response.json();
      },

      prepare: () => ({
        bind: () => mockD1Client.prepare(),
        first: async () => null,
        all: async () => ({ results: [], success: true, meta: {} }),
        run: async () => ({ success: true, meta: {} }),
        raw: async () => []
      }),

      batch: async () => [],
      dump: async () => new ArrayBuffer(0)
    };

    const adapter = new PrismaD1(mockD1Client as any);
    const prisma = new PrismaClient({ adapter });

    return { success: true, data: prisma };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to create Prisma D1 client: ${String(error)}`
      } as AppError
    };
  }
};

// Database operations using Prisma
export const initializePrismaDatabase = async (prisma: PrismaD1Client): AsyncResult<void> => {
  try {
    // Prisma will handle migrations automatically
    // This is just a connection test
    await prisma.$connect();
    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to initialize Prisma database: ${String(error)}`
      } as AppError
    };
  }
};

// Insert processed image using Prisma
export const insertProcessedImagePrisma = async (
  prisma: PrismaD1Client,
  data: {
    id: string;
    fileName: string;
    driveFileId: string;
    processedAt: Date;
    movedToSaved?: boolean;
  }
): AsyncResult<void> => {
  try {
    await prisma.processedImage.create({
      data: {
        id: data.id,
        fileName: data.fileName,
        driveFileId: data.driveFileId,
        processedAt: data.processedAt,
        movedToSaved: data.movedToSaved || false
      }
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to insert processed image: ${String(error)}`
      } as AppError
    };
  }
};

// Get processed image using Prisma
export const getProcessedImagePrisma = async (
  prisma: PrismaD1Client,
  driveFileId: string
): AsyncResult<ProcessedImage | null> => {
  try {
    const result = await prisma.processedImage.findUnique({
      where: { driveFileId }
    });

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to get processed image: ${String(error)}`
      } as AppError
    };
  }
};

// Get all processed images using Prisma
export const getAllProcessedImagesPrisma = async (
  prisma: PrismaD1Client
): AsyncResult<readonly ProcessedImage[]> => {
  try {
    const results = await prisma.processedImage.findMany({
      orderBy: { processedAt: 'desc' }
    });

    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to get all processed images: ${String(error)}`
      } as AppError
    };
  }
};

// Mark image as moved using Prisma
export const markImageAsMovedPrisma = async (
  prisma: PrismaD1Client,
  driveFileId: string
): AsyncResult<void> => {
  try {
    await prisma.processedImage.update({
      where: { driveFileId },
      data: { movedToSaved: true }
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to mark image as moved: ${String(error)}`
      } as AppError
    };
  }
};

// Post operations
export const insertPostPrisma = async (
  prisma: PrismaD1Client,
  data: {
    id: string;
    processedImageId: string;
    content: string;
    ocrCachedAt?: Date;
    platform?: string;
    characterCount?: number;
  }
): AsyncResult<void> => {
  try {
    await prisma.post.create({
      data: {
        id: data.id,
        processedImageId: data.processedImageId,
        content: data.content,
        ocrCachedAt: data.ocrCachedAt ?? null,
        platform: data.platform || "x",
        characterCount: data.characterCount ?? null
      }
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to insert post: ${String(error)}`
      } as AppError
    };
  }
};

export const getPostByProcessedImageIdPrisma = async (
  prisma: PrismaD1Client,
  processedImageId: string
): AsyncResult<any | null> => {
  try {
    const post = await prisma.post.findFirst({
      where: { processedImageId }
    });

    return { success: true, data: post };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to get post by processed image ID: ${String(error)}`
      } as AppError
    };
  }
};

export const updatePostOcrContentPrisma = async (
  prisma: PrismaD1Client,
  postId: string,
  content: string,
  ocrCachedAt: Date
): AsyncResult<void> => {
  try {
    await prisma.post.update({
      where: { id: postId },
      data: {
        content,
        ocrCachedAt,
        characterCount: content.length
      }
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to update post OCR content: ${String(error)}`
      } as AppError
    };
  }
};

// Check if image is processed using Prisma
export const isImageProcessedPrisma = async (
  prisma: PrismaD1Client,
  driveFileId: string
): AsyncResult<boolean> => {
  try {
    const result = await prisma.processedImage.findUnique({
      where: { driveFileId }
    });

    return { success: true, data: result !== null };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to check if image is processed: ${String(error)}`
      } as AppError
    };
  }
};

// Get unprocessed image IDs using Prisma
export const getUnprocessedImageIdsPrisma = async (
  prisma: PrismaD1Client,
  allDriveFileIds: readonly string[]
): AsyncResult<readonly string[]> => {
  try {
    if (allDriveFileIds.length === 0) {
      return { success: true, data: [] };
    }

    const processedImages = await prisma.processedImage.findMany({
      where: {
        driveFileId: {
          in: [...allDriveFileIds]
        }
      },
      select: { driveFileId: true }
    });

    const processedIds = new Set(processedImages.map(img => img.driveFileId));
    const unprocessedIds = allDriveFileIds.filter(id => !processedIds.has(id));

    return { success: true, data: unprocessedIds };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to get unprocessed image IDs: ${String(error)}`
      } as AppError
    };
  }
};

// Insert multiple processed images using Prisma
export const insertMultipleProcessedImagesPrisma = async (
  prisma: PrismaD1Client,
  images: readonly {
    id: string;
    fileName: string;
    driveFileId: string;
    processedAt: Date;
    movedToSaved?: boolean;
  }[]
): AsyncResult<void> => {
  try {
    await prisma.processedImage.createMany({
      data: images.map(image => ({
        id: image.id,
        fileName: image.fileName,
        driveFileId: image.driveFileId,
        processedAt: image.processedAt,
        movedToSaved: image.movedToSaved || false
      }))
    });

    return { success: true, data: undefined };
  } catch (error) {
    return {
      success: false,
      error: {
        type: "D1Error",
        message: `Failed to insert multiple processed images: ${String(error)}`
      } as AppError
    };
  }
};

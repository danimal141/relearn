import type { AsyncResult } from "../../types";
import type { D1Config, ProcessedImageInsert } from "./types";
import type { ProcessedImage } from "@prisma/client";
import {
  createPrismaD1Client,
  initializePrismaDatabase,
  insertProcessedImagePrisma,
  getProcessedImagePrisma,
  getAllProcessedImagesPrisma,
  markImageAsMovedPrisma,
  isImageProcessedPrisma,
  getUnprocessedImageIdsPrisma,
  insertMultipleProcessedImagesPrisma,
  type PrismaD1Client
} from "./prisma";

// Export Prisma client type as D1Database for backward compatibility
export type D1Database = PrismaD1Client;

// D1 Client creation using Prisma
export const createD1Client = async (config: D1Config): AsyncResult<D1Database> => {
  return createPrismaD1Client(config);
};

// Database initialization using Prisma
export const initializeDatabase = async (db: D1Database): AsyncResult<void> => {
  return initializePrismaDatabase(db);
};

// Record operations using Prisma
export const insertProcessedImage = async (
  db: D1Database,
  image: ProcessedImageInsert
): AsyncResult<void> => {
  const data = {
    id: image.id,
    fileName: image.file_name,
    driveFileId: image.drive_file_id,
    processedAt: new Date(image.processed_at),
    movedToSaved: image.moved_to_saved || false
  };

  return insertProcessedImagePrisma(db, data);
};

export const getProcessedImage = async (
  db: D1Database,
  driveFileId: string
): AsyncResult<ProcessedImage | null> => {
  return getProcessedImagePrisma(db, driveFileId);
};

export const getAllProcessedImages = async (
  db: D1Database
): AsyncResult<readonly ProcessedImage[]> => {
  return getAllProcessedImagesPrisma(db);
};

export const markImageAsMoved = async (
  db: D1Database,
  driveFileId: string
): AsyncResult<void> => {
  return markImageAsMovedPrisma(db, driveFileId);
};

// Utility functions using Prisma
export const isImageProcessed = async (
  db: D1Database,
  driveFileId: string
): AsyncResult<boolean> => {
  return isImageProcessedPrisma(db, driveFileId);
};

export const getUnprocessedImageIds = async (
  db: D1Database,
  allDriveFileIds: readonly string[]
): AsyncResult<readonly string[]> => {
  return getUnprocessedImageIdsPrisma(db, allDriveFileIds);
};

// Batch operations using Prisma
export const insertMultipleProcessedImages = async (
  db: D1Database,
  images: readonly ProcessedImageInsert[]
): AsyncResult<void> => {
  const data = images.map(image => ({
    id: image.id,
    fileName: image.file_name,
    driveFileId: image.drive_file_id,
    processedAt: new Date(image.processed_at),
    movedToSaved: image.moved_to_saved || false
  }));

  return insertMultipleProcessedImagesPrisma(db, data);
};

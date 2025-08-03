-- CreateTable
CREATE TABLE "processed_images" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "file_name" TEXT NOT NULL,
    "drive_file_id" TEXT NOT NULL,
    "processed_at" DATETIME NOT NULL,
    "moved_to_saved" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "processed_images_drive_file_id_key" ON "processed_images"("drive_file_id");

-- CreateIndex
CREATE INDEX "processed_images_created_at_idx" ON "processed_images"("created_at");

-- CreateIndex
CREATE INDEX "processed_images_processed_at_idx" ON "processed_images"("processed_at");

-- CreateTable
CREATE TABLE "posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "processed_image_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "ocr_cached_at" DATETIME,
    "platform" TEXT NOT NULL DEFAULT 'x',
    "character_count" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "posts_processed_image_id_fkey" FOREIGN KEY ("processed_image_id") REFERENCES "processed_images" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "posts_processed_image_id_idx" ON "posts"("processed_image_id");

-- CreateIndex
CREATE INDEX "posts_created_at_idx" ON "posts"("created_at");
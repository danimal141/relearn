import { runRelearn } from "./relearn/relearn";

const main = async (): Promise<void> => {
  console.log("🚀 Starting relearn workflow...");

  const result = await runRelearn();

  if (result.success) {
    const { images, slackResults, status } = result.data;

    console.log(`✅ Relearn completed with status: ${status}`);
    console.log(`📸 Found ${images.files.length} images`);
    console.log(`🔗 Created ${images.links.length} public links`);
    console.log(`💬 Sent ${slackResults.length} Slack messages`);

    if (images.files.length > 0) {
      console.log("\n📋 Image details:");
      images.files.forEach((file, index) => {
        console.log(`  ${index + 1}. ${file.name} (${file.mimeType})`);
      });
    }

    if (status === "partial") {
      console.log("⚠️  Some operations failed, but images were processed successfully");
    }
  } else {
    console.error(`❌ Relearn failed: ${result.error.message}`);
    console.error(`Error type: ${result.error.type}`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});

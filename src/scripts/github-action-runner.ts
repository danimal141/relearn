import { runOptimizedRelearn } from "../relearn/relearn";

// GitHub Actions runner script
const runGitHubAction = async (): Promise<void> => {
  const startTime = Date.now();

  console.log("🤖 GitHub Actions Relearn Runner");
  console.log("================================");
  console.log(`📅 Date: ${new Date().toISOString()}`);
  console.log(`🌍 Environment: ${process.env["NODE_ENV"] || "production"}`);
  console.log(`🖼️  Image count: ${process.env["IMAGE_COUNT"] || "5"}`);
  console.log("================================\n");

  try {
    const result = await runOptimizedRelearn();

    if (result.success) {
      const { images, slackResults, ocrResults, status } = result.data;
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log("\n================================");
      console.log("✅ EXECUTION SUMMARY");
      console.log("================================");
      console.log(`📊 Status: ${status}`);
      console.log(`⏱️  Duration: ${duration}s`);
      console.log(`📸 Images processed: ${images.files.length}`);
      console.log(`🔗 Public links created: ${images.links.length}`);
      console.log(`💬 Slack messages sent: ${slackResults.length}`);

      if (ocrResults) {
        console.log(`🔍 OCR extractions: ${ocrResults.length}`);

        // Log OCR statistics
        const totalChars = ocrResults.reduce((sum, ocr) => sum + ocr.content.length, 0);
        const avgChars = ocrResults.length > 0 ? Math.round(totalChars / ocrResults.length) : 0;
        console.log(`📝 Total characters extracted: ${totalChars}`);
        console.log(`📊 Average characters per image: ${avgChars}`);
      }

      // Output for GitHub Actions summary
      console.log("\n::group::Detailed Results");
      images.files.forEach((file, index) => {
        console.log(`\n📄 Image ${index + 1}: ${file.name}`);
        console.log(`   ID: ${file.id}`);
        console.log(`   Type: ${file.mimeType}`);

        const ocr = ocrResults?.find((_r) => images.files.some((f) => f.id === file.id));

        if (ocr) {
          const preview = ocr.content.slice(0, 200).replace(/\n/g, " ");
          console.log(`   OCR Preview: ${preview}${ocr.content.length > 200 ? "..." : ""}`);
          console.log(`   Characters: ${ocr.content.length}`);
        }
      });
      console.log("::endgroup::");

      // Set outputs for potential use in subsequent steps
      console.log(`::set-output name=status::${status}`);
      console.log(`::set-output name=images_count::${images.files.length}`);
      console.log(`::set-output name=slack_count::${slackResults.length}`);
      console.log(`::set-output name=duration::${duration}`);

      // Exit with appropriate code
      if (status === "partial") {
        console.warn("\n⚠️  Some operations failed, check logs for details");
        process.exit(0); // Still exit successfully for partial success
      }
    } else {
      console.error("\n================================");
      console.error("❌ EXECUTION FAILED");
      console.error("================================");
      console.error(`Error type: ${result.error.type}`);
      console.error(`Error message: ${result.error.message}`);

      // GitHub Actions error annotation
      console.error(`::error::Relearn workflow failed: ${result.error.message}`);

      process.exit(1);
    }
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.error("\n================================");
    console.error("💥 UNEXPECTED ERROR");
    console.error("================================");
    console.error(`Duration before failure: ${duration}s`);
    console.error("Error details:", error);

    // GitHub Actions error annotation
    console.error(`::error::Unexpected error in Relearn workflow: ${String(error)}`);

    process.exit(1);
  }
};

// Run the action
runGitHubAction().catch((error) => {
  console.error("💥 Fatal error in GitHub Action runner:", error);
  process.exit(1);
});

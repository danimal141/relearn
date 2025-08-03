#!/usr/bin/env tsx

import { createPrismaD1Client } from '../cloudflare/d1/prisma.js';

async function testDatabase() {
  console.log('🧪 Testing D1 database connection...');

  // Test HTTP-based connection (for development)
  const config = {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
    apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
    databaseId: process.env.CLOUDFLARE_DATABASE_ID || 'a9c5bf31-696f-4b74-817e-d4146a628922'
  };

  try {
    console.log('📊 Creating Prisma client...');
    const clientResult = await createPrismaD1Client(config);

    if (!clientResult.success) {
      console.error('❌ Failed to create client:', clientResult.error.message);
      return;
    }

    const prisma = clientResult.data;
    console.log('✅ Prisma client created successfully');

    // Test basic database operation
    console.log('📝 Testing database query...');

    // Try to count rows (this tests the connection)
    const count = await prisma.processedImage.count();
    console.log(`📈 Current records in processed_images table: ${count}`);

    // Insert a test record
    console.log('➕ Inserting test record...');
    const testRecord = await prisma.processedImage.create({
      data: {
        id: `test_${Date.now()}`,
        fileName: 'test-image.jpg',
        driveFileId: `test_drive_${Date.now()}`,
        processedAt: new Date(),
        movedToSaved: false
      }
    });
    console.log('✅ Test record created:', testRecord.id);

    // Count again
    const newCount = await prisma.processedImage.count();
    console.log(`📈 Records after insert: ${newCount}`);

    // Clean up test record
    await prisma.processedImage.delete({
      where: { id: testRecord.id }
    });
    console.log('🧹 Test record cleaned up');

    await prisma.$disconnect();
    console.log('🎉 Database test completed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run the test
testDatabase().catch(console.error);

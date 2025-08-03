import type { PrismaClient } from '@prisma/client';
import type { WorkerEnv, RelearnResponse } from './types';
import type { AppConfig } from '../../types';
import { createPrismaD1ClientFromBinding } from '../d1/prisma.js';

// Import Cloudflare Workers global types
/// <reference types="@cloudflare/workers-types" />

// Initialize Prisma with D1 adapter (official Cloudflare approach)
export function createPrismaClient(env: WorkerEnv): PrismaClient {
  // env.DB is a native Cloudflare D1Database binding
  return createPrismaD1ClientFromBinding(env.DB as any);
}

// Convert Worker env to AppConfig
export function createAppConfig(env: WorkerEnv): AppConfig {
  return {
    googleServiceAccountKey: env.GOOGLE_SERVICE_ACCOUNT_KEY,
    googleDriveFolderId: env.GOOGLE_DRIVE_FOLDER_ID,
    slackWebhookUrl: env.SLACK_WEBHOOK_URL,
    imageCount: Number.parseInt(env.IMAGE_COUNT || '5', 10),
    // These are not needed in Workers environment
    cloudflareAccountId: '',
    cloudflareApiToken: '',
    cloudflareDatabaseId: ''
  };
}

// Main relearn workflow handler
export async function handleRelearnWorkflow(env: WorkerEnv): Promise<RelearnResponse> {
  try {
    // Create Prisma client with D1 adapter
    const prisma = createPrismaClient(env);

    // Import the optimized workflow
    const { executeOptimizedRelearnWorkflow } = await import('../../relearn/relearn.js');

    // Create configuration
    const config = createAppConfig(env);

    // Execute workflow
    const result = await executeOptimizedRelearnWorkflow(config);

    // Disconnect Prisma client
    await prisma.$disconnect();

    if (result.success) {
      return {
        success: true,
        data: result.data
      };
    }
    return {
      success: false,
      error: result.error.message
    };
  } catch (error) {
    return {
      success: false,
      error: `Relearn workflow failed: ${String(error)}`
    };
  }
}

// HTTP request handler
export async function handleFetchRequest(
  request: Request,
  env: WorkerEnv
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const path = url.pathname;

    switch (path) {
      case '/relearn': {
        const result = await handleRelearnWorkflow(env);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json' },
          status: result.success ? 200 : 500
        });
      }

      case '/health':
        return new Response('OK', { status: 200 });

      default:
        return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Request handling failed: ${String(error)}`
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
}

// Scheduled handler for daily execution
export async function handleScheduledEvent(
  _event: ScheduledEvent,
  env: WorkerEnv
): Promise<void> {
  try {
    const result = await handleRelearnWorkflow(env);
    if (!result.success) {
      console.error('Scheduled relearn failed:', result.error);
    } else {
      console.log('Scheduled relearn completed successfully');
    }
  } catch (error) {
    console.error('Scheduled handler error:', error);
  }
}

/**
 * E2E Test Script for Local Image-to-3D generation
 *
 * Uses Hunyuan provider which supports base64 images directly.
 *
 * Usage:
 *   pnpm tsx scripts/test-local-image.ts [image-path]
 *
 * Examples:
 *   pnpm tsx scripts/test-local-image.ts                    # Uses scripts/image.png
 *   pnpm tsx scripts/test-local-image.ts ./my-image.jpg     # Uses custom path
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { HunyuanProvider, Magi3DClient, TaskType, TaskStatus } from '../src';
import { config } from 'dotenv';

// Load .env if available
config();

const SECRET_ID = process.env.TENCENT_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_SECRET_KEY;

// Get script directory for default image path
const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_IMAGE = resolve(__dirname, 'image.png');

// Get image path from argument or use default
const imagePath = process.argv[2] ? resolve(process.argv[2]) : DEFAULT_IMAGE;

if (!SECRET_ID || !SECRET_KEY) {
  console.error('Error: TENCENT_SECRET_ID and TENCENT_SECRET_KEY environment variables are required');
  console.error('');
  console.error('Hunyuan is used because it supports base64 images directly.');
  console.error('');
  console.error('Usage:');
  console.error('  TENCENT_SECRET_ID=xxx TENCENT_SECRET_KEY=xxx pnpm tsx scripts/test-local-image.ts');
  process.exit(1);
}

if (!existsSync(imagePath)) {
  console.error(`Error: Image file not found: ${imagePath}`);
  console.error('');
  console.error('Please provide a valid image path or place image.png in the scripts folder.');
  process.exit(1);
}

// Determine MIME type from extension
function getMimeType(filePath: string): string {
  const ext = extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
  return mimeTypes[ext] || 'image/png';
}

async function main() {
  console.log('=== Local Image-to-3D E2E Test (Hunyuan) ===\n');

  // Read and encode image
  console.log(`Image: ${imagePath}`);
  const imageBuffer = readFileSync(imagePath);
  const mimeType = getMimeType(imagePath);
  const base64Image = `data:${mimeType};base64,${imageBuffer.toString('base64')}`;
  console.log(`Size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);
  console.log(`Format: ${mimeType}\n`);

  // Create provider and client
  console.log('Creating Hunyuan provider...');
  const provider = new HunyuanProvider({
    secretId: SECRET_ID!,
    secretKey: SECRET_KEY!,
    region: 'ap-guangzhou'
  });
  const client = new Magi3DClient(provider);
  console.log('Done\n');

  try {
    console.log('Submitting Image-to-3D task...');
    const taskId = await client.createTask({
      type: TaskType.IMAGE_TO_3D,
      input: base64Image
    });

    console.log(`Task ID: ${taskId}`);
    console.log('Polling for completion...\n');

    const result = await client.pollUntilDone(taskId, {
      interval: 5000,
      timeout: 600000,  // 10 minutes
      onProgress: (task) => {
        const bar = '='.repeat(Math.floor(task.progress / 5));
        const empty = ' '.repeat(20 - Math.floor(task.progress / 5));
        console.log(`[${bar}${empty}] ${task.progress}% - ${task.progressDetail || task.status}`);
      }
    });

    console.log('\nResult:');
    console.log(`  Status: ${result.status}`);
    console.log(`  GLB Model: ${result.result?.modelGlb}`);
    console.log(`  Thumbnail: ${result.result?.thumbnail}`);

    if (result.status === TaskStatus.SUCCEEDED) {
      console.log('\n=== Test PASSED ===');
    } else {
      console.log('\n=== Test FAILED ===');
      console.log(`  Error: ${result.error?.message}`);
    }

  } catch (error) {
    console.error('\n=== Test FAILED ===');
    console.error('  Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

/**
 * E2E Test Script for Tripo Provider
 *
 * Usage:
 *   TRIPO_API_KEY=your-key pnpm tsx scripts/test-tripo.ts
 *
 * Or create a .env file with:
 *   TRIPO_API_KEY=your-key
 *
 * Then run:
 *   pnpm tsx scripts/test-tripo.ts
 */

import { TripoProvider, Magi3DClient, TaskType, TaskStatus } from '../src';
import { config } from 'dotenv';

// Load .env if available
config();

const API_KEY = process.env.TRIPO_API_KEY;

if (!API_KEY) {
  console.error('Error: TRIPO_API_KEY environment variable is required');
  console.error('');
  console.error('Usage:');
  console.error('  TRIPO_API_KEY=your-key pnpm tsx scripts/test-tripo.ts');
  process.exit(1);
}

async function main() {
  console.log('=== Tripo Provider E2E Test ===\n');

  // 1. Create provider and client
  console.log('1. Creating provider and client...');
  const provider = new TripoProvider({ apiKey: API_KEY! });
  const client = new Magi3DClient(provider);
  console.log('   Done\n');

  // 2. Test Text-to-3D
  console.log('2. Testing Text-to-3D generation...');
  console.log('   Prompt: "a simple wooden chair"');

  try {
    const taskId = await client.createTask({
      type: TaskType.TEXT_TO_3D,
      prompt: 'a simple wooden chair',
      providerOptions: {
        model_version: 'v2.0-20240919'  // Use faster model for testing
      }
    });

    console.log(`   Task ID: ${taskId}`);
    console.log('   Polling for completion...\n');

    const result = await client.pollUntilDone(taskId, {
      interval: 3000,
      timeout: 300000,  // 5 minutes
      onProgress: (task) => {
        const bar = '='.repeat(Math.floor(task.progress / 5));
        const empty = ' '.repeat(20 - Math.floor(task.progress / 5));
        console.log(`   [${bar}${empty}] ${task.progress}% - ${task.progressDetail || task.status}`);
      }
    });

    console.log('\n3. Result:');
    console.log(`   Status: ${result.status}`);
    console.log(`   GLB Model: ${result.result?.modelGlb}`);
    console.log(`   Thumbnail: ${result.result?.thumbnail}`);

    if (result.status === TaskStatus.SUCCEEDED) {
      console.log('\n=== Test PASSED ===');
    } else {
      console.log('\n=== Test FAILED ===');
      console.log(`   Error: ${result.error?.message}`);
    }

  } catch (error) {
    console.error('\n=== Test FAILED ===');
    console.error('   Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

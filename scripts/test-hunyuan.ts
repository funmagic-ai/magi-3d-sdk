/**
 * E2E Test Script for Hunyuan Provider
 *
 * Usage:
 *   TENCENT_SECRET_ID=your-id TENCENT_SECRET_KEY=your-key pnpm tsx scripts/test-hunyuan.ts
 *
 * Or create a .env file with:
 *   TENCENT_SECRET_ID=your-id
 *   TENCENT_SECRET_KEY=your-key
 *
 * Then run:
 *   pnpm tsx scripts/test-hunyuan.ts
 */

import { HunyuanProvider, Magi3DClient, TaskType, TaskStatus } from '../src';
import { config } from 'dotenv';

// Load .env if available
config();

const SECRET_ID = process.env.TENCENT_SECRET_ID;
const SECRET_KEY = process.env.TENCENT_SECRET_KEY;

if (!SECRET_ID || !SECRET_KEY) {
  console.error('Error: TENCENT_SECRET_ID and TENCENT_SECRET_KEY environment variables are required');
  console.error('');
  console.error('Usage:');
  console.error('  TENCENT_SECRET_ID=xxx TENCENT_SECRET_KEY=xxx pnpm tsx scripts/test-hunyuan.ts');
  process.exit(1);
}

async function main() {
  console.log('=== Hunyuan Provider E2E Test ===\n');

  // 1. Create provider and client
  console.log('1. Creating provider and client...');
  const provider = new HunyuanProvider({
    secretId: SECRET_ID!,
    secretKey: SECRET_KEY!,
    region: 'ap-guangzhou'
  });
  const client = new Magi3DClient(provider);
  console.log('   Done\n');

  // 2. Test Text-to-3D
  console.log('2. Testing Text-to-3D generation...');
  console.log('   Prompt: "一把简单的木椅" (a simple wooden chair)');

  try {
    const taskId = await client.createTask({
      type: TaskType.TEXT_TO_3D,
      prompt: '一把简单的木椅',
      providerOptions: {
        EnablePBR: false,
        FaceCount: 100000
      }
    });

    console.log(`   Task ID: ${taskId}`);
    console.log('   Polling for completion...\n');

    const result = await client.pollUntilDone(taskId, {
      interval: 5000,  // Hunyuan can be slower
      timeout: 600000,  // 10 minutes
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

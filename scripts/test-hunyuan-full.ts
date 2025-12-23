/**
 * Comprehensive E2E Test Script for Hunyuan Provider
 *
 * Tests all supported task types with various parameters.
 *
 * Usage:
 *   pnpm tsx scripts/test-hunyuan-full.ts [test-name]
 *
 * Examples:
 *   pnpm tsx scripts/test-hunyuan-full.ts           # Run quick tests
 *   pnpm tsx scripts/test-hunyuan-full.ts all       # Run all tests
 *   pnpm tsx scripts/test-hunyuan-full.ts text      # Only text-to-3d tests
 *   pnpm tsx scripts/test-hunyuan-full.ts image     # Only image-to-3d tests
 *   pnpm tsx scripts/test-hunyuan-full.ts pipeline  # Full pipeline tests
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { HunyuanProvider, Magi3DClient, TaskType, TaskStatus, StandardTask, TaskError, ApiError } from '../src';
import { config } from 'dotenv';

config();

const SECRET_ID = process.env.HUNYUAN_SECRET_ID;
const SECRET_KEY = process.env.HUNYUAN_SECRET_KEY;

if (!SECRET_ID || !SECRET_KEY) {
  console.error('Error: HUNYUAN_SECRET_ID and HUNYUAN_SECRET_KEY environment variables are required');
  process.exit(1);
}

// Test configuration
const __dirname = dirname(fileURLToPath(import.meta.url));
const LOCAL_IMAGE_PATH = resolve(__dirname, 'image.png');
const TEST_IMAGE_URL = 'https://cdn.i.haymarketmedia.asia/?n=campaign-asia%2Fcontent%2F20241030094458_Untitled+design+(5).jpg&h=570&w=855&q=100&v=20250320&c=1';

const POLL_OPTIONS = {
  interval: 5000,
  timeout: 600000,
  onProgress: (task: StandardTask) => {
    const bar = '='.repeat(Math.floor(task.progress / 5));
    const empty = ' '.repeat(20 - Math.floor(task.progress / 5));
    process.stdout.write(`\r   [${bar}${empty}] ${task.progress}% - ${task.progressDetail || task.status}`);
  }
};

// Helper to convert local image to base64
function imageToBase64(imagePath: string): string {
  const buffer = readFileSync(imagePath);
  const ext = extname(imagePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp'
  };
  const mimeType = mimeTypes[ext] || 'image/png';
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

// Helper to print test results
function printResult(result: StandardTask) {
  console.log('\n   Result:');
  console.log(`     Status: ${result.status}`);
  if (result.result?.model) console.log(`     Model (primary): ${result.result.model.substring(0, 80)}...`);
  if (result.result?.modelGlb) console.log(`     GLB: ${result.result.modelGlb.substring(0, 80)}...`);
  if (result.result?.modelPbr) console.log(`     PBR: ${result.result.modelPbr.substring(0, 80)}...`);
  if (result.result?.thumbnail) console.log(`     Thumbnail: ${result.result.thumbnail.substring(0, 80)}...`);
  if (result.rawResponse) {
    console.log('     Raw Response:');
    console.log(JSON.stringify(result.rawResponse, null, 2).split('\n').map(l => '       ' + l).join('\n'));
  }
  if (result.error) {
    console.log(`     Error Code: ${result.error.code}`);
    console.log(`     Error Message: ${result.error.message}`);
    if (result.error.raw) {
      console.log('     Error Raw Response:');
      console.log(JSON.stringify(result.error.raw, null, 2).split('\n').map(l => '       ' + l).join('\n'));
    }
  }
}

// ============================================
// Test Cases
// ============================================

interface TestCase {
  name: string;
  run: (client: Magi3DClient) => Promise<{ passed: boolean; taskId?: string }>;
}

const tests: TestCase[] = [
  // ----------------------------------------
  // TEXT-TO-3D TESTS
  // ----------------------------------------
  {
    name: 'text-to-3d-basic',
    run: async (client) => {
      console.log('\n[TEST] Text-to-3D - Basic');
      console.log('   Prompt: "一把简单的木椅" (a simple wooden chair)');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: '一把简单的木椅'
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'text-to-3d-with-pbr',
    run: async (client) => {
      console.log('\n[TEST] Text-to-3D - With PBR Materials');
      console.log('   Prompt: "一辆红色跑车" (a red sports car)');
      console.log('   Options: EnablePBR=true');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: '一辆红色跑车',
        providerOptions: {
          EnablePBR: true
        }
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'text-to-3d-lowpoly',
    run: async (client) => {
      console.log('\n[TEST] Text-to-3D - LowPoly Style');
      console.log('   Prompt: "一只可爱的兔子" (a cute rabbit)');
      console.log('   Options: GenerateType=LowPoly');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: '一只可爱的兔子',
        providerOptions: {
          GenerateType: 'LowPoly'
        }
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'text-to-3d-geometry',
    run: async (client) => {
      console.log('\n[TEST] Text-to-3D - Geometry Mode (White Model)');
      console.log('   Prompt: "一个茶壶" (a teapot)');
      console.log('   Options: GenerateType=Geometry');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: '一个茶壶',
        providerOptions: {
          GenerateType: 'Geometry'
        }
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'text-to-3d-high-poly',
    run: async (client) => {
      console.log('\n[TEST] Text-to-3D - High Polygon Count');
      console.log('   Prompt: "精细的中国龙雕像" (a detailed Chinese dragon statue)');
      console.log('   Options: FaceCount=500000');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: '精细的中国龙雕像',
        providerOptions: {
          FaceCount: 500000
        }
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },

  // ----------------------------------------
  // IMAGE-TO-3D TESTS
  // ----------------------------------------
  {
    name: 'image-to-3d-url',
    run: async (client) => {
      console.log('\n[TEST] Image-to-3D - From URL');
      console.log(`   Image URL: ${TEST_IMAGE_URL}`);

      const taskId = await client.createTask({
        type: TaskType.IMAGE_TO_3D,
        input: TEST_IMAGE_URL
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'image-to-3d-base64',
    run: async (client) => {
      if (!existsSync(LOCAL_IMAGE_PATH)) {
        console.log('\n[TEST] Image-to-3D - From Base64 (SKIPPED - no local image)');
        return { passed: true };
      }

      console.log('\n[TEST] Image-to-3D - From Base64 (Local File)');
      console.log(`   Image: ${LOCAL_IMAGE_PATH}`);

      const base64Image = imageToBase64(LOCAL_IMAGE_PATH);
      console.log(`   Size: ${(base64Image.length / 1024).toFixed(1)} KB (base64)`);

      const taskId = await client.createTask({
        type: TaskType.IMAGE_TO_3D,
        input: base64Image
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'image-to-3d-with-options',
    run: async (client) => {
      console.log('\n[TEST] Image-to-3D - With Provider Options');
      console.log(`   Image URL: ${TEST_IMAGE_URL}`);
      console.log('   Options: EnablePBR=true, FaceCount=100000');

      const taskId = await client.createTask({
        type: TaskType.IMAGE_TO_3D,
        input: TEST_IMAGE_URL,
        providerOptions: {
          EnablePBR: true,
          FaceCount: 100000
        }
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  }
];

// ----------------------------------------
// PIPELINE TESTS
// ----------------------------------------
const pipelineTests: TestCase[] = [
  {
    name: 'pipeline-decimate',
    run: async (client) => {
      console.log('\n[TEST] Decimate Pipeline - Text-to-3D → Reduce Faces');

      // Step 1: Create base model with high poly
      console.log('\n   Step 1: Text-to-3D (High Poly)');
      console.log('   Prompt: "一座古老的城堡" (an ancient castle)');

      const baseTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: '一座古老的城堡',
        providerOptions: {
          FaceCount: 200000
        }
      });
      console.log(`   Task ID: ${baseTaskId}`);

      const baseResult = await client.pollUntilDone(baseTaskId, POLL_OPTIONS);
      if (baseResult.status !== TaskStatus.SUCCEEDED) {
        printResult(baseResult);
        return { passed: false };
      }
      console.log('\n   ✓ Base model created');

      // Step 2: Get the GLB URL for decimation
      const modelUrl = baseResult.result?.modelGlb;
      if (!modelUrl) {
        console.log('   ✗ No model URL returned');
        return { passed: false };
      }

      // Step 3: Decimate
      console.log('\n   Step 2: Reduce Faces');
      console.log('   Target: low (reduce polygon count)');

      const decimateTaskId = await client.createTask({
        type: TaskType.DECIMATE,
        modelUrl,  // Hunyuan requires model URL, not task ID
        providerOptions: {
          FaceLevel: 'low'
        }
      });
      console.log(`   Task ID: ${decimateTaskId}`);

      const decimateResult = await client.pollUntilDone(decimateTaskId, POLL_OPTIONS);
      printResult(decimateResult);

      return { passed: decimateResult.status === TaskStatus.SUCCEEDED };
    }
  },
  {
    name: 'pipeline-texture',
    run: async (client) => {
      console.log('\n[TEST] Texture Pipeline - Geometry → Add Texture');

      // Step 1: Create geometry-only model using GenerateType: 'Geometry'
      console.log('\n   Step 1: Text-to-3D (Geometry Mode)');
      console.log('   Prompt: "一把武士刀" (a samurai sword)');
      console.log('   Options: GenerateType=Geometry');

      const baseTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: '一把武士刀',
        providerOptions: {
          GenerateType: 'Geometry'
        }
      });
      console.log(`   Task ID: ${baseTaskId}`);

      const baseResult = await client.pollUntilDone(baseTaskId, POLL_OPTIONS);
      if (baseResult.status !== TaskStatus.SUCCEEDED) {
        printResult(baseResult);
        return { passed: false };
      }
      console.log('\n   ✓ Geometry model created');

      // Get model URL for texture task
      const modelUrl = baseResult.result?.model;
      if (!modelUrl) {
        console.log('   ✗ No model URL returned');
        return { passed: false };
      }

      // Step 2: Add texture
      console.log('\n   Step 2: Add Texture');
      console.log('   Prompt: "golden blade with black handle"');

      const textureTaskId = await client.createTask({
        type: TaskType.TEXTURE,
        modelUrl,  // Hunyuan requires model URL, not task ID
        prompt: 'golden blade with black handle'
      });
      console.log(`   Task ID: ${textureTaskId}`);

      const textureResult = await client.pollUntilDone(textureTaskId, POLL_OPTIONS);
      printResult(textureResult);

      return { passed: textureResult.status === TaskStatus.SUCCEEDED };
    }
  }
];

// ============================================
// Main
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║         Hunyuan Provider - Comprehensive E2E Tests         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const provider = new HunyuanProvider({
    secretId: SECRET_ID!,
    secretKey: SECRET_KEY!,
    region: 'ap-guangzhou'
  });
  const client = new Magi3DClient(provider);

  const filter = process.argv[2]?.toLowerCase();
  let testsToRun: TestCase[] = [];

  if (!filter) {
    // Run a subset of quick tests by default
    testsToRun = [tests[0], tests[5]]; // text-basic, image-url
    console.log('\n Running quick tests (use "all" for full suite)\n');
  } else if (filter === 'all') {
    testsToRun = [...tests, ...pipelineTests];
    console.log('\n Running ALL tests\n');
  } else if (filter === 'text') {
    testsToRun = tests.filter(t => t.name.startsWith('text-'));
    console.log('\n Running text-to-3D tests\n');
  } else if (filter === 'image') {
    testsToRun = tests.filter(t => t.name.startsWith('image-'));
    console.log('\n Running image-to-3D tests\n');
  } else if (filter === 'pipeline') {
    testsToRun = pipelineTests;
    console.log('\n Running pipeline tests\n');
  } else {
    // Find specific test by name
    const test = [...tests, ...pipelineTests].find(t => t.name.includes(filter));
    if (test) {
      testsToRun = [test];
      console.log(`\n Running test: ${test.name}\n`);
    } else {
      console.error(`Unknown test filter: ${filter}`);
      console.error('Available: all, text, image, pipeline, or specific test name');
      process.exit(1);
    }
  }

  const results: { name: string; passed: boolean }[] = [];

  for (const test of testsToRun) {
    try {
      const { passed } = await test.run(client);
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`\n   Exception thrown:`);
      if (error instanceof TaskError) {
        // TaskError from pollUntilDone - includes full task with raw response
        console.error(`     Error Code: ${error.code}`);
        console.error(`     Message: ${error.message}`);
        if (error.task.error?.raw) {
          console.error('     Raw Provider Response:');
          console.error(JSON.stringify(error.task.error.raw, null, 2).split('\n').map(l => '       ' + l).join('\n'));
        }
      } else if (error instanceof ApiError) {
        // ApiError from createTask or getTaskStatus - API-level errors
        console.error(`     Error Code: ${error.code}`);
        console.error(`     Message: ${error.message}`);
        if (error.httpStatus) {
          console.error(`     HTTP Status: ${error.httpStatus}`);
        }
        if (error.raw) {
          console.error('     Raw Provider Response:');
          console.error(JSON.stringify(error.raw, null, 2).split('\n').map(l => '       ' + l).join('\n'));
        }
      } else if (error instanceof Error) {
        console.error(`     Message: ${error.message}`);
        // Show stack trace for debugging
        if (error.stack) {
          console.error('     Stack:', error.stack.split('\n').slice(1, 4).join('\n'));
        }
      } else {
        console.error(`     Error: ${error}`);
      }
      results.push({ name: test.name, passed: false });
    }
  }

  // Summary
  console.log('\n');
  console.log('════════════════════════════════════════════════════════════');
  console.log('                        TEST SUMMARY');
  console.log('════════════════════════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const r of results) {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}`);
  }

  console.log('');
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);

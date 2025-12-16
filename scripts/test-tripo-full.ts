/**
 * Comprehensive E2E Test Script for Tripo Provider
 *
 * Tests all supported task types with various parameters.
 *
 * Usage:
 *   pnpm tsx scripts/test-tripo-full.ts [test-name]
 *
 * Examples:
 *   pnpm tsx scripts/test-tripo-full.ts           # Run all tests
 *   pnpm tsx scripts/test-tripo-full.ts text      # Only text-to-3d tests
 *   pnpm tsx scripts/test-tripo-full.ts image     # Only image-to-3d tests
 *   pnpm tsx scripts/test-tripo-full.ts pipeline  # Full pipeline test
 */

import { TripoProvider, Magi3DClient, TaskType, TaskStatus, StandardTask } from '../src';
import { config } from 'dotenv';

config();

const API_KEY = process.env.TRIPO_API_KEY;

if (!API_KEY) {
  console.error('Error: TRIPO_API_KEY environment variable is required');
  process.exit(1);
}

// Test configuration
const TEST_IMAGE_URL = 'https://tripo-data.rg1.data.tripo3d.com/tripo-studio/20251212/6a2ac8cc-900c-4c29-a131-e43e3ce913ff/523e7273-9dff-4085-bd8f-c8e136859a41.png?Key-Pair-Id=K1676C64NMVM2J&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly90cmlwby1kYXRhLnJnMS5kYXRhLnRyaXBvM2QuY29tL3RyaXBvLXN0dWRpby8yMDI1MTIxMi82YTJhYzhjYy05MDBjLTRjMjktYTEzMS1lNDNlM2NlOTEzZmYvNTIzZTcyNzMtOWRmZi00MDg1LWJkOGYtYzhlMTM2ODU5YTQxLnBuZyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc2NTkyOTYwMH19fV19&Signature=NNQR9IK1IPAXnVHYFE7nyxWQCZ1p~6leHKSKtL-dlvW6spYPcHl~FxZAiIOJfa7-bpq~lJ3m2~HUnGksTPIo~NmOrmXySzyoxvIIbdnFVPiiYBAt9zge2glPMntqKdFbBcbEbE72qW4l9R0otrKpTwDYaLV~pTq5chHE~VNAh4YuMt4Yv7TJcYfQOjR1dKudwZxCh9NnF7AXityT9N1aSJhZoeYv1Bod~eUNNPuKS0Tnsnh68JQQhoZDz3trR9LNryQzspIAaPuBuFeOnc13uOLm1DvD6OqsCZGIpDjfBVfMHYPRDsR9G4hR2ACo2H9O9JHlBOi0TxxWWfC-10RxOg__';
const POLL_OPTIONS = {
  interval: 3000,
  timeout: 300000,
  onProgress: (task: StandardTask) => {
    const bar = '='.repeat(Math.floor(task.progress / 5));
    const empty = ' '.repeat(20 - Math.floor(task.progress / 5));
    process.stdout.write(`\r   [${bar}${empty}] ${task.progress}% - ${task.progressDetail || task.status}`);
  }
};

// Helper to print test results
function printResult(result: StandardTask) {
  console.log('\n   Result:');
  console.log(`     Status: ${result.status}`);
  if (result.result?.modelGlb) console.log(`     GLB: ${result.result.modelGlb.substring(0, 80)}...`);
  if (result.result?.thumbnail) console.log(`     Thumbnail: ${result.result.thumbnail.substring(0, 80)}...`);
  if (result.error) console.log(`     Error: ${result.error.message}`);
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
      console.log('   Prompt: "a simple wooden chair"');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a simple wooden chair'
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'text-to-3d-with-options',
    run: async (client) => {
      console.log('\n[TEST] Text-to-3D - With Provider Options');
      console.log('   Prompt: "a futuristic robot"');
      console.log('   Options: model_version=v2.0-20240919, pbr=true, texture_quality=detailed');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a futuristic robot',
        providerOptions: {
          model_version: 'v2.0-20240919',
          pbr: true,
          texture_quality: 'detailed'
        }
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'text-to-3d-negative-prompt',
    run: async (client) => {
      console.log('\n[TEST] Text-to-3D - With Negative Prompt');
      console.log('   Prompt: "a cute cartoon cat"');
      console.log('   Negative: "realistic, scary, dark"');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a cute cartoon cat',
        negative_prompt: 'realistic, scary, dark'
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
    name: 'image-to-3d-basic',
    run: async (client) => {
      console.log('\n[TEST] Image-to-3D - Basic');
      console.log(`   Image: ${TEST_IMAGE_URL}`);

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
    name: 'image-to-3d-with-prompt',
    run: async (client) => {
      console.log('\n[TEST] Image-to-3D - With Prompt');
      console.log(`   Image: ${TEST_IMAGE_URL}`);
      console.log('   Prompt: "a dinosaur toy"');

      const taskId = await client.createTask({
        type: TaskType.IMAGE_TO_3D,
        input: TEST_IMAGE_URL,
        prompt: 'a dinosaur toy'
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
      console.log(`   Image: ${TEST_IMAGE_URL}`);
      console.log('   Options: model_version=v2.0-20240919, pbr=true');

      const taskId = await client.createTask({
        type: TaskType.IMAGE_TO_3D,
        input: TEST_IMAGE_URL,
        providerOptions: {
          model_version: 'v2.0-20240919',
          pbr: true,
          texture_quality: 'detailed'
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
// PIPELINE TEST (depends on previous task)
// ----------------------------------------
const pipelineTests: TestCase[] = [
  {
    name: 'pipeline-full',
    run: async (client) => {
      console.log('\n[TEST] Full Pipeline - Text-to-3D → Rig → Animate → Convert');

      // Step 1: Create base model
      console.log('\n   Step 1: Text-to-3D');
      console.log('   Prompt: "a humanoid robot character"');

      const baseTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a humanoid robot character',
        providerOptions: {
          model_version: 'v2.0-20240919'
        }
      });
      console.log(`   Task ID: ${baseTaskId}`);

      const baseResult = await client.pollUntilDone(baseTaskId, POLL_OPTIONS);
      if (baseResult.status !== TaskStatus.SUCCEEDED) {
        printResult(baseResult);
        return { passed: false };
      }
      console.log('\n   ✓ Base model created');

      // Step 2: Add rigging
      console.log('\n   Step 2: Add Rigging');
      console.log('   Skeleton: biped');

      const rigTaskId = await client.createTask({
        type: TaskType.RIG,
        taskId: baseTaskId,
        skeleton: 'biped',
        outFormat: 'glb'
      });
      console.log(`   Task ID: ${rigTaskId}`);

      const rigResult = await client.pollUntilDone(rigTaskId, POLL_OPTIONS);
      if (rigResult.status !== TaskStatus.SUCCEEDED) {
        printResult(rigResult);
        return { passed: false };
      }
      console.log('\n   ✓ Rigging added');

      // Step 3: Apply animation
      console.log('\n   Step 3: Apply Animation');
      console.log('   Animation: preset:walk');

      const animateTaskId = await client.createTask({
        type: TaskType.ANIMATE,
        taskId: rigTaskId,
        animation: 'preset:walk',
        outFormat: 'glb'
      });
      console.log(`   Task ID: ${animateTaskId}`);

      const animateResult = await client.pollUntilDone(animateTaskId, POLL_OPTIONS);
      if (animateResult.status !== TaskStatus.SUCCEEDED) {
        printResult(animateResult);
        return { passed: false };
      }
      console.log('\n   ✓ Animation applied');

      // Step 4: Convert to FBX
      console.log('\n   Step 4: Convert to FBX');

      const convertTaskId = await client.createTask({
        type: TaskType.CONVERT,
        taskId: baseTaskId,
        format: 'fbx'
      });
      console.log(`   Task ID: ${convertTaskId}`);

      const convertResult = await client.pollUntilDone(convertTaskId, POLL_OPTIONS);
      printResult(convertResult);

      return { passed: convertResult.status === TaskStatus.SUCCEEDED };
    }
  },
  {
    name: 'pipeline-texture',
    run: async (client) => {
      console.log('\n[TEST] Texture Pipeline - Text-to-3D → Re-texture');

      // Step 1: Create base model
      console.log('\n   Step 1: Text-to-3D');
      console.log('   Prompt: "a medieval sword"');

      const baseTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a medieval sword',
        providerOptions: {
          model_version: 'v2.0-20240919',
          texture: false  // Create without texture first
        }
      });
      console.log(`   Task ID: ${baseTaskId}`);

      const baseResult = await client.pollUntilDone(baseTaskId, POLL_OPTIONS);
      if (baseResult.status !== TaskStatus.SUCCEEDED) {
        printResult(baseResult);
        return { passed: false };
      }
      console.log('\n   ✓ Base model created');

      // Step 2: Add texture
      console.log('\n   Step 2: Add Texture');
      console.log('   Prompt: "golden ornate blade with ruby gems"');

      const textureTaskId = await client.createTask({
        type: TaskType.TEXTURE,
        taskId: baseTaskId,
        prompt: 'golden ornate blade with ruby gems',
        enablePBR: true
      });
      console.log(`   Task ID: ${textureTaskId}`);

      const textureResult = await client.pollUntilDone(textureTaskId, POLL_OPTIONS);
      printResult(textureResult);

      return { passed: textureResult.status === TaskStatus.SUCCEEDED };
    }
  },
  {
    name: 'pipeline-decimate',
    run: async (client) => {
      console.log('\n[TEST] Decimate Pipeline - Text-to-3D → Decimate');

      // Step 1: Create base model
      console.log('\n   Step 1: Text-to-3D');
      console.log('   Prompt: "a detailed castle"');

      const baseTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a detailed castle',
        providerOptions: {
          model_version: 'v2.0-20240919'
        }
      });
      console.log(`   Task ID: ${baseTaskId}`);

      const baseResult = await client.pollUntilDone(baseTaskId, POLL_OPTIONS);
      if (baseResult.status !== TaskStatus.SUCCEEDED) {
        printResult(baseResult);
        return { passed: false };
      }
      console.log('\n   ✓ Base model created');

      // Step 2: Decimate
      console.log('\n   Step 2: Decimate (reduce polygons)');
      console.log('   Target: 10000 faces');

      const decimateTaskId = await client.createTask({
        type: TaskType.DECIMATE,
        taskId: baseTaskId,
        targetFaceCount: 10000
      });
      console.log(`   Task ID: ${decimateTaskId}`);

      const decimateResult = await client.pollUntilDone(decimateTaskId, POLL_OPTIONS);
      printResult(decimateResult);

      return { passed: decimateResult.status === TaskStatus.SUCCEEDED };
    }
  }
];

// ============================================
// Main
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          Tripo Provider - Comprehensive E2E Tests          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const provider = new TripoProvider({ apiKey: API_KEY! });
  const client = new Magi3DClient(provider);

  const filter = process.argv[2]?.toLowerCase();
  let testsToRun: TestCase[] = [];

  if (!filter) {
    // Run a subset of quick tests by default
    testsToRun = [tests[0], tests[3]]; // text-basic, image-basic
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
      console.error(`\n   Error: ${error instanceof Error ? error.message : error}`);
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

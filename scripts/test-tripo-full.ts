/**
 * Comprehensive E2E Test Script for Tripo Provider
 *
 * Tests all supported task types with various parameters.
 * Excludes: multiview_to_model (requires prepared multi-view images).
 *
 * Usage:
 *   pnpm tsx scripts/test-tripo-full.ts [test-name]
 *
 * Examples:
 *   pnpm tsx scripts/test-tripo-full.ts           # Run quick tests (text-basic + image-basic)
 *   pnpm tsx scripts/test-tripo-full.ts all        # Run ALL tests (slow, many API calls)
 *   pnpm tsx scripts/test-tripo-full.ts text       # Only text-to-3d tests
 *   pnpm tsx scripts/test-tripo-full.ts image      # Only image-to-3d tests
 *   pnpm tsx scripts/test-tripo-full.ts generate   # Only image generation tests
 *   pnpm tsx scripts/test-tripo-full.ts upload      # STS upload tests
 *   pnpm tsx scripts/test-tripo-full.ts pipeline   # All pipeline tests
 *   pnpm tsx scripts/test-tripo-full.ts stylize    # Specific test by name substring
 */

import { TripoProvider, Magi3DClient, TaskType, TaskStatus, StandardTask, TaskError, ApiError } from '../src';
import { config } from 'dotenv';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

config();

const API_KEY = process.env.TRIPO_API_KEY;

if (!API_KEY) {
  console.error('Error: TRIPO_API_KEY environment variable is required');
  process.exit(1);
}

// Test configuration
const TEST_IMAGE_URL = 'https://cdn.i.haymarketmedia.asia/?n=campaign-asia%2Fcontent%2F20241030094458_Untitled+design+(5).jpg&h=570&w=855&q=100&v=20250320&c=1';
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
  if (result.result?.model) console.log(`     Model (primary): ${result.result.model.substring(0, 80)}...`);
  if (result.result?.modelGlb) console.log(`     GLB: ${result.result.modelGlb.substring(0, 80)}...`);
  if (result.result?.modelPbr) console.log(`     PBR: ${result.result.modelPbr.substring(0, 80)}...`);
  if (result.result?.thumbnail) console.log(`     Thumbnail: ${result.result.thumbnail.substring(0, 80)}...`);
  if (result.result?.generatedImage) console.log(`     Generated Image: ${result.result.generatedImage.substring(0, 80)}...`);
  if (result.result?.riggable !== undefined) console.log(`     Riggable: ${result.result.riggable}`);
  if (result.result?.rigType) console.log(`     Rig Type: ${result.result.rigType}`);
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
      console.log(`   Image: ${TEST_IMAGE_URL.substring(0, 60)}...`);

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
    name: 'image-to-3d-with-options',
    run: async (client) => {
      console.log('\n[TEST] Image-to-3D - With Provider Options');
      console.log(`   Image: ${TEST_IMAGE_URL.substring(0, 60)}...`);
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
  },

  // ----------------------------------------
  // IMAGE GENERATION TESTS
  // ----------------------------------------
  {
    name: 'text-to-image',
    run: async (client) => {
      console.log('\n[TEST] Text-to-Image');
      console.log('   Prompt: "a cute corgi puppy sitting on green grass, studio lighting"');

      const taskId = await client.createTask({
        type: TaskType.TEXT_TO_IMAGE,
        prompt: 'a cute corgi puppy sitting on green grass, studio lighting'
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      const hasImage = !!result.result?.generatedImage;
      console.log(`     Generated image present: ${hasImage}`);

      return { passed: result.status === TaskStatus.SUCCEEDED && hasImage, taskId };
    }
  },
  {
    name: 'generate-image',
    run: async (client) => {
      console.log('\n[TEST] Generate Image (Advanced) - With Image Input');
      console.log('   Prompt: "transform this into a 3D render style"');
      console.log(`   Input: ${TEST_IMAGE_URL.substring(0, 60)}...`);

      const taskId = await client.createTask({
        type: TaskType.GENERATE_IMAGE,
        prompt: 'transform this into a 3D render style',
        input: TEST_IMAGE_URL,
        providerOptions: {
          model_version: 'flux.1_kontext_pro'
        }
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await client.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      const hasImage = !!result.result?.generatedImage;
      console.log(`     Generated image present: ${hasImage}`);

      return { passed: result.status === TaskStatus.SUCCEEDED && hasImage, taskId };
    }
  }
];

// ----------------------------------------
// STS UPLOAD TESTS (use separate provider with stsUpload: true)
// ----------------------------------------
const uploadTests: TestCase[] = [
  {
    name: 'upload-image-url',
    run: async () => {
      console.log('\n[TEST] STS Upload - Image-to-3D via URL re-upload');
      console.log('   stsUpload: true (fetches URL locally, uploads to Tripo S3, then creates task)');
      console.log(`   Image: ${TEST_IMAGE_URL.substring(0, 60)}...`);

      const stsProvider = new TripoProvider({ apiKey: API_KEY!, stsUpload: true });
      const stsClient = new Magi3DClient(stsProvider);

      const taskId = await stsClient.createTask({
        type: TaskType.IMAGE_TO_3D,
        input: TEST_IMAGE_URL
      });
      console.log(`   Task ID: ${taskId}`);

      const result = await stsClient.pollUntilDone(taskId, POLL_OPTIONS);
      printResult(result);

      return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
    }
  },
  {
    name: 'upload-image-local-file',
    run: async () => {
      console.log('\n[TEST] STS Upload - Image-to-3D from local file path');
      console.log('   Downloads test image to /tmp, then uses local path with stsUpload');

      // Step 1: Download test image to a temp file
      const { default: axios } = await import('axios');
      const imgResponse = await axios.get(TEST_IMAGE_URL, { responseType: 'arraybuffer' });
      const tmpPath = join(tmpdir(), `tripo-test-${Date.now()}.jpg`);
      await writeFile(tmpPath, Buffer.from(imgResponse.data));
      console.log(`   Temp file: ${tmpPath}`);

      try {
        const stsProvider = new TripoProvider({ apiKey: API_KEY!, stsUpload: true });
        const stsClient = new Magi3DClient(stsProvider);

        const taskId = await stsClient.createTask({
          type: TaskType.IMAGE_TO_3D,
          input: tmpPath
        });
        console.log(`   Task ID: ${taskId}`);

        const result = await stsClient.pollUntilDone(taskId, POLL_OPTIONS);
        printResult(result);

        return { passed: result.status === TaskStatus.SUCCEEDED, taskId };
      } finally {
        // Clean up temp file
        await unlink(tmpPath).catch(() => {});
      }
    }
  },
  {
    name: 'upload-import-model',
    run: async () => {
      console.log('\n[TEST] STS Upload - Import Model Pipeline');
      console.log('   Step 1: Generate model, Step 2: Download GLB, Step 3: Import via STS upload');

      // Step 1: Generate a simple model to get a GLB URL
      const normalProvider = new TripoProvider({ apiKey: API_KEY! });
      const normalClient = new Magi3DClient(normalProvider);

      console.log('\n   Step 1: Generate model');
      console.log('   Prompt: "a simple sphere"');

      const genTaskId = await normalClient.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a simple sphere'
      });
      console.log(`   Task ID: ${genTaskId}`);

      const genResult = await normalClient.pollUntilDone(genTaskId, POLL_OPTIONS);
      if (genResult.status !== TaskStatus.SUCCEEDED || !genResult.result?.model) {
        printResult(genResult);
        return { passed: false };
      }
      console.log('\n   + Model generated');

      // Step 2: Download the GLB to a temp file
      const modelUrl = genResult.result.model;
      const { default: axios } = await import('axios');
      const modelResponse = await axios.get(modelUrl, { responseType: 'arraybuffer' });
      const tmpPath = join(tmpdir(), `tripo-test-${Date.now()}.glb`);
      await writeFile(tmpPath, Buffer.from(modelResponse.data));
      console.log(`   Downloaded GLB to: ${tmpPath} (${modelResponse.data.byteLength} bytes)`);

      try {
        // Step 3: Import via STS upload
        console.log('\n   Step 3: Import Model via STS Upload');

        const stsProvider = new TripoProvider({ apiKey: API_KEY!, stsUpload: true });
        const stsClient = new Magi3DClient(stsProvider);

        const importTaskId = await stsClient.createTask({
          type: TaskType.IMPORT,
          input: tmpPath
        });
        console.log(`   Task ID: ${importTaskId}`);

        const importResult = await stsClient.pollUntilDone(importTaskId, POLL_OPTIONS);
        printResult(importResult);

        return { passed: importResult.status === TaskStatus.SUCCEEDED };
      } finally {
        await unlink(tmpPath).catch(() => {});
      }
    }
  }
];

// ----------------------------------------
// PIPELINE TESTS (multi-step, each depends on previous)
// ----------------------------------------
const pipelineTests: TestCase[] = [
  {
    name: 'pipeline-animation',
    run: async (client) => {
      console.log('\n[TEST] Animation Pipeline - Text-to-3D -> PreRigCheck -> Rig -> Animate -> Convert');

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
      console.log('\n   + Base model created');

      // Step 2: Pre-rig check
      console.log('\n   Step 2: Pre-Rig Check');

      const prerigTaskId = await client.createTask({
        type: TaskType.PRE_RIG_CHECK,
        taskId: baseTaskId
      });
      console.log(`   Task ID: ${prerigTaskId}`);

      const prerigResult = await client.pollUntilDone(prerigTaskId, POLL_OPTIONS);
      if (prerigResult.status !== TaskStatus.SUCCEEDED) {
        printResult(prerigResult);
        return { passed: false };
      }
      const riggable = prerigResult.result?.riggable;
      const rigType = prerigResult.result?.rigType;
      console.log(`\n   + Pre-rig check done: riggable=${riggable}, rig_type=${rigType}`);

      // Step 3: Add rigging
      console.log('\n   Step 3: Add Rigging');
      console.log(`   Rig type: ${rigType || 'biped'}`);

      const rigTaskId = await client.createTask({
        type: TaskType.RIG,
        taskId: baseTaskId,
        skeleton: (rigType as 'biped') || 'biped',
        outFormat: 'glb'
      });
      console.log(`   Task ID: ${rigTaskId}`);

      const rigResult = await client.pollUntilDone(rigTaskId, POLL_OPTIONS);
      if (rigResult.status !== TaskStatus.SUCCEEDED) {
        printResult(rigResult);
        return { passed: false };
      }
      console.log('\n   + Rigging added');

      // Step 4: Apply animation
      console.log('\n   Step 4: Apply Animation');
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
      console.log('\n   + Animation applied');

      // Step 5: Convert to FBX
      console.log('\n   Step 5: Convert to FBX');

      const convertTaskId = await client.createTask({
        type: TaskType.CONVERT,
        taskId: animateTaskId,
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
      console.log('\n[TEST] Texture Pipeline - Text-to-3D -> Re-texture');

      // Step 1: Create base model without texture
      console.log('\n   Step 1: Text-to-3D (no texture)');
      console.log('   Prompt: "a medieval sword"');

      const baseTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a medieval sword',
        providerOptions: {
          model_version: 'v2.0-20240919',
          texture: false
        }
      });
      console.log(`   Task ID: ${baseTaskId}`);

      const baseResult = await client.pollUntilDone(baseTaskId, POLL_OPTIONS);
      if (baseResult.status !== TaskStatus.SUCCEEDED) {
        printResult(baseResult);
        return { passed: false };
      }
      console.log('\n   + Base model created');

      // Step 2: Add texture with text prompt
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
      console.log('\n[TEST] Decimate Pipeline - Text-to-3D -> Lowpoly');

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
      console.log('\n   + Base model created');

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
  },
  {
    name: 'pipeline-stylize',
    run: async (client) => {
      console.log('\n[TEST] Stylize Pipeline - Text-to-3D -> Stylize (voxel)');

      // Step 1: Create base model
      console.log('\n   Step 1: Text-to-3D');
      console.log('   Prompt: "a small house"');

      const baseTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a small house',
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
      console.log('\n   + Base model created');

      // Step 2: Stylize
      console.log('\n   Step 2: Stylize (voxel)');

      const stylizeTaskId = await client.createTask({
        type: TaskType.STYLIZE,
        taskId: baseTaskId,
        style: 'voxel'
      });
      console.log(`   Task ID: ${stylizeTaskId}`);

      const stylizeResult = await client.pollUntilDone(stylizeTaskId, POLL_OPTIONS);
      printResult(stylizeResult);

      return { passed: stylizeResult.status === TaskStatus.SUCCEEDED };
    }
  },
  {
    name: 'pipeline-mesh-editing',
    run: async (client) => {
      console.log('\n[TEST] Mesh Editing Pipeline - Text-to-3D -> Segment -> Completion');

      // Step 1: Create base model
      console.log('\n   Step 1: Text-to-3D');
      console.log('   Prompt: "a wooden toy figure with movable joints"');

      const baseTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a wooden toy figure with movable joints',
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
      console.log('\n   + Base model created');

      // Step 2: Mesh segmentation
      console.log('\n   Step 2: Mesh Segmentation');

      const segmentTaskId = await client.createTask({
        type: TaskType.SEGMENT,
        taskId: baseTaskId
      });
      console.log(`   Task ID: ${segmentTaskId}`);

      const segmentResult = await client.pollUntilDone(segmentTaskId, POLL_OPTIONS);
      if (segmentResult.status !== TaskStatus.SUCCEEDED) {
        printResult(segmentResult);
        return { passed: false };
      }
      console.log('\n   + Segmentation done');

      // Step 3: Mesh completion (complete all parts)
      console.log('\n   Step 3: Mesh Completion');

      const completionTaskId = await client.createTask({
        type: TaskType.MESH_COMPLETION,
        taskId: segmentTaskId
      });
      console.log(`   Task ID: ${completionTaskId}`);

      const completionResult = await client.pollUntilDone(completionTaskId, POLL_OPTIONS);
      printResult(completionResult);

      return { passed: completionResult.status === TaskStatus.SUCCEEDED };
    }
  },
  {
    name: 'pipeline-text-image-model',
    run: async (client) => {
      console.log('\n[TEST] Text -> Image -> Model Pipeline');

      // Step 1: Generate image from text
      console.log('\n   Step 1: Text-to-Image');
      console.log('   Prompt: "a red sports car, front view, white background"');

      const imageTaskId = await client.createTask({
        type: TaskType.TEXT_TO_IMAGE,
        prompt: 'a red sports car, front view, white background'
      });
      console.log(`   Task ID: ${imageTaskId}`);

      const imageResult = await client.pollUntilDone(imageTaskId, POLL_OPTIONS);
      if (imageResult.status !== TaskStatus.SUCCEEDED || !imageResult.result?.generatedImage) {
        printResult(imageResult);
        return { passed: false };
      }
      const generatedImageUrl = imageResult.result.generatedImage;
      console.log(`\n   + Image generated: ${generatedImageUrl.substring(0, 60)}...`);

      // Step 2: Create 3D model from generated image
      console.log('\n   Step 2: Image-to-3D (from generated image)');

      const modelTaskId = await client.createTask({
        type: TaskType.IMAGE_TO_3D,
        input: generatedImageUrl
      });
      console.log(`   Task ID: ${modelTaskId}`);

      const modelResult = await client.pollUntilDone(modelTaskId, POLL_OPTIONS);
      printResult(modelResult);

      return { passed: modelResult.status === TaskStatus.SUCCEEDED };
    }
  },
  {
    name: 'pipeline-refine',
    run: async (client) => {
      console.log('\n[TEST] Refine Pipeline - Text-to-3D (v1.4) -> Refine');
      console.log('   Note: refine_model only works with model_version < v2.0');

      // Step 1: Create draft model with v1.4
      console.log('\n   Step 1: Text-to-3D (v1.4-20240625)');
      console.log('   Prompt: "a simple cube"');

      const draftTaskId = await client.createTask({
        type: TaskType.TEXT_TO_3D,
        prompt: 'a simple cube',
        providerOptions: {
          model_version: 'v1.4-20240625'
        }
      });
      console.log(`   Task ID: ${draftTaskId}`);

      const draftResult = await client.pollUntilDone(draftTaskId, POLL_OPTIONS);
      if (draftResult.status !== TaskStatus.SUCCEEDED) {
        printResult(draftResult);
        return { passed: false };
      }
      console.log('\n   + Draft model created');

      // Step 2: Refine
      console.log('\n   Step 2: Refine Model');

      const refineTaskId = await client.createTask({
        type: TaskType.REFINE,
        taskId: draftTaskId
      });
      console.log(`   Task ID: ${refineTaskId}`);

      const refineResult = await client.pollUntilDone(refineTaskId, POLL_OPTIONS);
      printResult(refineResult);

      return { passed: refineResult.status === TaskStatus.SUCCEEDED };
    }
  }
];

// ============================================
// Main
// ============================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════════╗');
  console.log('║           Tripo Provider - Comprehensive E2E Tests            ║');
  console.log('╚════════════════════════════════════════════════════════════════╝');

  const provider = new TripoProvider({ apiKey: API_KEY! });
  const client = new Magi3DClient(provider);

  const allTests = [...tests, ...uploadTests, ...pipelineTests];
  const filter = process.argv[2]?.toLowerCase();
  let testsToRun: TestCase[] = [];

  if (!filter) {
    // Run quick tests by default
    testsToRun = allTests.filter(t =>
      t.name === 'text-to-3d-basic' || t.name === 'image-to-3d-basic'
    );
    console.log('\n Running quick tests (use "all" for full suite)\n');
  } else if (filter === 'all') {
    testsToRun = allTests;
    console.log('\n Running ALL tests\n');
  } else if (filter === 'text') {
    testsToRun = tests.filter(t => t.name.startsWith('text-to-3d'));
    console.log('\n Running text-to-3D tests\n');
  } else if (filter === 'image') {
    testsToRun = tests.filter(t => t.name.startsWith('image-to-3d'));
    console.log('\n Running image-to-3D tests\n');
  } else if (filter === 'generate') {
    testsToRun = tests.filter(t =>
      t.name === 'text-to-image' || t.name === 'generate-image'
    );
    console.log('\n Running image generation tests\n');
  } else if (filter === 'upload') {
    testsToRun = uploadTests;
    console.log('\n Running STS upload tests\n');
  } else if (filter === 'pipeline') {
    testsToRun = pipelineTests;
    console.log('\n Running pipeline tests\n');
  } else {
    // Find tests by name substring
    testsToRun = allTests.filter(t => t.name.includes(filter));
    if (testsToRun.length === 0) {
      console.error(`No tests match filter: "${filter}"`);
      console.error('\nAvailable tests:');
      for (const t of allTests) {
        console.error(`  - ${t.name}`);
      }
      console.error('\nFilter groups: all, text, image, generate, upload, pipeline');
      process.exit(1);
    }
    console.log(`\n Running ${testsToRun.length} test(s) matching "${filter}"\n`);
  }

  const results: { name: string; passed: boolean }[] = [];

  for (const test of testsToRun) {
    try {
      const { passed } = await test.run(client);
      results.push({ name: test.name, passed });
    } catch (error) {
      console.error(`\n   Exception thrown:`);
      if (error instanceof TaskError) {
        console.error(`     Error Code: ${error.code}`);
        console.error(`     Message: ${error.message}`);
        if (error.task.error?.raw) {
          console.error('     Raw Provider Response:');
          console.error(JSON.stringify(error.task.error.raw, null, 2).split('\n').map(l => '       ' + l).join('\n'));
        }
      } else if (error instanceof ApiError) {
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
  console.log('════════════════════════════════════════════════════════════════');
  console.log('                        TEST SUMMARY');
  console.log('════════════════════════════════════════════════════════════════');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  for (const r of results) {
    console.log(`  ${r.passed ? '✓' : '✗'} ${r.name}`);
  }

  console.log('');
  console.log(`  Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log('════════════════════════════════════════════════════════════════');

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(console.error);

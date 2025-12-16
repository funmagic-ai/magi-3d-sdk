// examples/node-basic.ts
// Basic Node.js usage example for Magi 3D SDK

import { Magi3DClient, TripoProvider } from 'magi-3d';

async function main() {
  // 1. Initialize provider with API key
  const provider = new TripoProvider({
    apiKey: process.env.TRIPO_API_KEY || 'your-api-key-here'
  });

  // 2. Create client
  const client = new Magi3DClient(provider);

  console.log('=== Text-to-3D Example ===');

  // 3. Create text-to-3D task
  const taskId = await client.createTask({
    type: 'TEXT_TO_3D',
    prompt: 'a small cat in T-pose',
    providerOptions: {
      model_version: 'v2.5-20250123',
      pbr: true,
      face_limit: 50000,
      texture_quality: 'standard'
    }
  });

  console.log(`Task created: ${taskId}`);

  // 4. Poll for completion with progress updates
  const result = await client.pollUntilDone(taskId, {
    interval: 3000,      // Check every 3 seconds
    timeout: 300000,     // Timeout after 5 minutes
    onProgress: (task) => {
      console.log(`Progress: ${task.progress}% - ${task.progressDetail || 'Processing...'}`);
    }
  });

  // 5. Display results
  console.log('\n=== Generation Complete ===');
  console.log('Status:', result.status);
  console.log('GLB Model:', result.result?.modelGlb);
  console.log('Thumbnail:', result.result?.thumbnail);

  // Optional: Post-process the model
  if (result.result?.modelGlb) {
    console.log('\n=== Converting to FBX ===');

    const convertTaskId = await client.postProcess({
      action: 'CONVERT',
      taskId: result.id,
      format: 'fbx'
    });

    const convertResult = await client.pollUntilDone(convertTaskId, {
      interval: 2000,
      onProgress: (task) => {
        console.log(`Convert progress: ${task.progress}%`);
      }
    });

    console.log('FBX Model:', convertResult.result?.modelFbx);
  }
}

// Run with error handling
main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

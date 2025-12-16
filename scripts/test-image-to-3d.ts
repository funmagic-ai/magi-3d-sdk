/**
 * E2E Test Script for Image-to-3D generation
 *
 * Usage:
 *   TRIPO_API_KEY=your-key pnpm tsx scripts/test-image-to-3d.ts [image-url]
 *
 * Example:
 *   TRIPO_API_KEY=xxx pnpm tsx scripts/test-image-to-3d.ts https://example.com/cat.jpg
 */

import { TripoProvider, Magi3DClient, TaskType, TaskStatus } from '../src';
import { config } from 'dotenv';

// Load .env if available
config();

const API_KEY = process.env.TRIPO_API_KEY;
const IMAGE_URL = process.argv[2] || 'https://tripo-data.rg1.data.tripo3d.com/tripo-studio/20251212/6a2ac8cc-900c-4c29-a131-e43e3ce913ff/523e7273-9dff-4085-bd8f-c8e136859a41.png?Key-Pair-Id=K1676C64NMVM2J&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly90cmlwby1kYXRhLnJnMS5kYXRhLnRyaXBvM2QuY29tL3RyaXBvLXN0dWRpby8yMDI1MTIxMi82YTJhYzhjYy05MDBjLTRjMjktYTEzMS1lNDNlM2NlOTEzZmYvNTIzZTcyNzMtOWRmZi00MDg1LWJkOGYtYzhlMTM2ODU5YTQxLnBuZyIsIkNvbmRpdGlvbiI6eyJEYXRlTGVzc1RoYW4iOnsiQVdTOkVwb2NoVGltZSI6MTc2NTkyOTYwMH19fV19&Signature=NNQR9IK1IPAXnVHYFE7nyxWQCZ1p~6leHKSKtL-dlvW6spYPcHl~FxZAiIOJfa7-bpq~lJ3m2~HUnGksTPIo~NmOrmXySzyoxvIIbdnFVPiiYBAt9zge2glPMntqKdFbBcbEbE72qW4l9R0otrKpTwDYaLV~pTq5chHE~VNAh4YuMt4Yv7TJcYfQOjR1dKudwZxCh9NnF7AXityT9N1aSJhZoeYv1Bod~eUNNPuKS0Tnsnh68JQQhoZDz3trR9LNryQzspIAaPuBuFeOnc13uOLm1DvD6OqsCZGIpDjfBVfMHYPRDsR9G4hR2ACo2H9O9JHlBOi0TxxWWfC-10RxOg__';

if (!API_KEY) {
  console.error('Error: TRIPO_API_KEY environment variable is required');
  process.exit(1);
}

async function main() {
  console.log('=== Image-to-3D E2E Test ===\n');

  const provider = new TripoProvider({ apiKey: API_KEY! });
  const client = new Magi3DClient(provider);

  console.log(`Image URL: ${IMAGE_URL}\n`);

  try {
    console.log('Submitting task...');
    const taskId = await client.createTask({
      type: TaskType.IMAGE_TO_3D,
      input: IMAGE_URL,
      providerOptions: {
        model_version: 'v2.0-20240919'
      }
    });

    console.log(`Task ID: ${taskId}`);
    console.log('Polling for completion...\n');

    const result = await client.pollUntilDone(taskId, {
      interval: 3000,
      timeout: 300000,
      onProgress: (task) => {
        console.log(`Progress: ${task.progress}% - ${task.status}`);
      }
    });

    console.log('\nResult:');
    console.log(`  Status: ${result.status}`);
    console.log(`  GLB: ${result.result?.modelGlb}`);

    if (result.status === TaskStatus.SUCCEEDED) {
      console.log('\n=== Test PASSED ===');
    }

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();

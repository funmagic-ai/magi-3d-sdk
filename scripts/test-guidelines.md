# E2E Test Guidelines

This document explains how to run the end-to-end tests for the Magi 3D SDK.

## Prerequisites

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Create a `.env` file in the project root with your API credentials:
   ```env
   # Tripo API Key (get at: https://platform.tripo3d.ai)
   TRIPO_API_KEY=your-tripo-api-key

   # Tencent Cloud credentials for Hunyuan (get at: https://console.cloud.tencent.com/cam/capi)
   TENCENT_SECRET_ID=your-secret-id
   TENCENT_SECRET_KEY=your-secret-key
   ```

## Available Test Scripts

### 1. Tripo Text-to-3D Test

Tests text-to-3D generation with Tripo provider.

```bash
pnpm test:tripo
```

**What it does:**
- Creates a 3D model from the prompt "a simple wooden chair"
- Polls until completion with progress updates
- Returns GLB model URL and thumbnail

### 2. Hunyuan Text-to-3D Test

Tests text-to-3D generation with Hunyuan provider.

```bash
pnpm test:hunyuan
```

**What it does:**
- Creates a 3D model from the prompt "一把简单的木椅" (a simple wooden chair)
- Polls until completion with progress updates
- Returns GLB model URL

### 3. Image-to-3D Test

Tests image-to-3D generation using a URL.

```bash
# With default test image
pnpm test:image

# With custom image URL
pnpm test:image https://example.com/your-image.jpg
```

## Using Local Images

### Option 1: Hunyuan with Base64 (Recommended for Local Files)

Hunyuan supports base64-encoded images directly. Create a test script:

```typescript
import { HunyuanProvider, Magi3DClient, TaskType } from '../src';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

// Read local image and convert to base64
const imageBuffer = readFileSync('./scripts/image.png');
const base64Image = `data:image/png;base64,${imageBuffer.toString('base64')}`;

const provider = new HunyuanProvider({
  secretId: process.env.TENCENT_SECRET_ID!,
  secretKey: process.env.TENCENT_SECRET_KEY!,
  region: 'ap-guangzhou'
});

const client = new Magi3DClient(provider);

const taskId = await client.createTask({
  type: TaskType.IMAGE_TO_3D,
  input: base64Image,
  prompt: 'optional refinement prompt'
});

const result = await client.pollUntilDone(taskId);
console.log('Model:', result.result?.modelGlb);
```

### Option 2: Tripo with Image Upload

Tripo requires URL inputs. For local files, you must first upload the image:

1. **Upload to Tripo's storage** (using their upload API)
2. **Upload to any public URL** (S3, Cloudflare, etc.)
3. **Use a temporary file hosting service**

Example with pre-uploaded URL:
```bash
pnpm test:image https://your-hosted-image.com/image.png
```

## Quick Test with Local Image (scripts/image.png)

To test with the local `scripts/image.png` file using Hunyuan:

```bash
pnpm tsx scripts/test-local-image.ts
```

## Test Output

Successful tests will show:
- Progress bar with percentage
- Final status (SUCCEEDED/FAILED)
- Model URLs (GLB, thumbnail)

Example output:
```
=== Tripo Provider E2E Test ===

1. Creating provider and client...
   Done

2. Testing Text-to-3D generation...
   Prompt: "a simple wooden chair"
   Task ID: abc123-def456
   Polling for completion...

   [====================] 100% - SUCCEEDED

3. Result:
   Status: SUCCEEDED
   GLB Model: https://...
   Thumbnail: https://...

=== Test PASSED ===
```

## Troubleshooting

### "TRIPO_API_KEY environment variable is required"
- Ensure `.env` file exists in project root
- Check that the key is named correctly

### "TENCENT_SECRET_ID and TENCENT_SECRET_KEY are required"
- Both credentials are needed for Hunyuan
- Get them from Tencent Cloud console

### Timeout errors
- Increase timeout in test script (default: 5 minutes for Tripo, 10 minutes for Hunyuan)
- Check API quotas

### "TripoProvider requires URL inputs"
- Tripo doesn't accept base64 directly
- Use a URL or switch to Hunyuan for local files

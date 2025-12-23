# Magi 3D SDK

Universal TypeScript SDK for 3D generative AI providers. Generate 3D models from text or images using a unified API across multiple providers.

## Features

- **Multi-provider support**: Tripo, Hunyuan (Tencent Cloud)
- **Unified API**: Single `createTask()` method for all operations
- **React Hooks**: `useCreateTask`, `useTaskStatus`, `usePolling`
- **TypeScript-first**: Full type safety and IntelliSense
- **Modern**: ESM + CJS, tree-shakeable

## Installation

```bash
npm install magi-3d
# or
pnpm add magi-3d
# or
yarn add magi-3d
```

## Architecture

The SDK follows a simple pattern:

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                               │
│  ─────────────────                                              │
│  import { useCreateTask, TaskType } from 'magi-3d/react';       │
│                                                                 │
│  Hook handles:                                                  │
│    POST /api/3d/task      →  submit task                        │
│    GET  /api/3d/task/:id  →  poll status                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (Your API Routes)                                      │
│  ─────────────────────────────────────────────────────────────  │
│  import { Magi3DClient, TripoProvider } from 'magi-3d/server';  │
│                                                                 │
│  POST /api/3d/task      → client.createTask(params)             │
│  GET  /api/3d/task/:id  → client.getTask(id)                    │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Backend: Create API Routes

```typescript
// app/api/3d/task/route.ts (Next.js App Router)
import { Magi3DClient, TripoProvider, TaskType } from 'magi-3d/server';

const provider = new TripoProvider({
  apiKey: process.env.TRIPO_API_KEY!
});
const client = new Magi3DClient(provider);

// Create task
export async function POST(req: Request) {
  const params = await req.json();
  const taskId = await client.createTask(params);
  return Response.json({ taskId });
}

// Get task status
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const taskId = searchParams.get('id')!;
  const task = await client.getTask(taskId);
  return Response.json(task);
}
```

### 2. Frontend: Use React Hooks

```tsx
'use client';

import { useCreateTask, TaskType, TaskStatus } from 'magi-3d/react';

export function TextTo3DGenerator() {
  const { createTask, task, isLoading, progress, error } = useCreateTask({
    api: '/api/3d',
    onSuccess: (task) => console.log('Done!', task.result?.modelGlb)
  });

  return (
    <div>
      <button
        onClick={() => createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'a cute cat sitting on a cushion'
        })}
        disabled={isLoading}
      >
        {isLoading ? `Generating (${progress}%)` : 'Generate'}
      </button>

      {task?.status === TaskStatus.SUCCEEDED && (
        <a href={task.result?.modelGlb} download>Download GLB</a>
      )}
    </div>
  );
}
```

### 3. Direct Usage (Node.js / Scripts)

```typescript
import { Magi3DClient, TripoProvider, TaskType } from 'magi-3d';

const provider = new TripoProvider({ apiKey: 'your-api-key' });
const client = new Magi3DClient(provider);

// Create task
const taskId = await client.createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a medieval sword'
});

// Poll until complete
const result = await client.pollUntilDone(taskId, {
  onProgress: (task) => console.log(`${task.progress}%`)
});

console.log('Model URL:', result.result?.modelGlb);
```

## Supported Providers

### Tripo

```typescript
import { TripoProvider } from 'magi-3d/server';

const provider = new TripoProvider({
  apiKey: 'your-tripo-api-key'
});
```

**Supported Task Types:**
- `TEXT_TO_3D` - Generate from text prompt
- `IMAGE_TO_3D` - Generate from image URL
- `MULTIVIEW_TO_3D` - Generate from multiple views
- `RIG` - Add skeletal rigging
- `ANIMATE` - Apply animation presets
- `TEXTURE` - Re-texture model
- `REFINE` - Improve quality
- `DECIMATE` - Reduce polygons
- `CONVERT` - Format conversion

### Hunyuan (Tencent Cloud)

```typescript
import { HunyuanProvider } from 'magi-3d/server';

const provider = new HunyuanProvider({
  secretId: 'your-tencent-secret-id',
  secretKey: 'your-tencent-secret-key',
  region: 'ap-guangzhou'
});
```

**Progress Reporting:** Hunyuan API does not return granular progress percentages. The SDK estimates progress based on task status:
- `PENDING` (WAIT) → 0%
- `PROCESSING` (RUN) → 50%
- `SUCCEEDED` (DONE) → 100%

The raw Hunyuan status is available in `task.progressDetail` for debugging.

**Supported Task Types:**
- `TEXT_TO_3D` - Generate from text prompt
- `IMAGE_TO_3D` - Generate from image URL or base64
- `MULTIVIEW_TO_3D` - Generate from multiple views (Pro only)
- `TEXTURE` - Add texture to geometry
- `DECIMATE` - Reduce face count 
- `UV_UNWRAP` - UV Unwrap
- `SEGMENT` - Component generation 
- `CONVERT` - Format conversion (sync)

## React Hooks

### `useCreateTask`

Unified hook for all task types (generation and post-processing).

```tsx
import { useCreateTask, TaskType } from 'magi-3d/react';

const {
  createTask,  // (params: TaskParams) => Promise<string>
  task,        // StandardTask | null
  taskId,      // string | null
  isLoading,   // boolean
  progress,    // number (0-100)
  error,       // Error | null
  reset,       // () => void
  stop         // () => void
} = useCreateTask({
  api: '/api/3d',
  pollingInterval: 3000,
  timeout: 300000,
  onProgress: (task) => {},
  onSuccess: (task) => {},
  onError: (error) => {}
});

// Text-to-3D
createTask({ type: TaskType.TEXT_TO_3D, prompt: 'a cat' });

// Image-to-3D
createTask({ type: TaskType.IMAGE_TO_3D, input: 'https://...' });

// Post-processing (rigging)
createTask({ type: TaskType.RIG, taskId: 'original-id', skeleton: 'humanoid' });

// Format conversion
createTask({ type: TaskType.CONVERT, taskId: 'original-id', format: 'fbx' });
```

### `useTaskStatus`

Track an existing task by ID.

```tsx
import { useTaskStatus } from 'magi-3d/react';

const { task, progress, startPolling, stopPolling } = useTaskStatus({
  api: '/api/3d',
  onComplete: (task) => console.log('Done!')
});

startPolling('existing-task-id');
```

## Task Types

All operations use a single `createTask()` method. The `type` field determines the operation:

| Type | Description | Required Params |
|------|-------------|-----------------|
| `TEXT_TO_3D` | Generate from text | `prompt` |
| `IMAGE_TO_3D` | Generate from image | `input` (URL or base64) |
| `MULTIVIEW_TO_3D` | Generate from multiple views | `inputs` (array of URLs) |
| `RIG` | Add skeletal rigging | `taskId`, `skeleton` |
| `ANIMATE` | Apply animation | `taskId`, `animation` |
| `TEXTURE` | Re-texture model | `taskId`, optional `prompt` |
| `REFINE` | Improve quality | `taskId` |
| `DECIMATE` | Reduce polygons | `taskId`, `targetFaceCount` |
| `CONVERT` | Format conversion | `taskId`, `format` |

> **Note:** `IMAGE_TO_3D` and `MULTIVIEW_TO_3D` do not support text prompts. Use `TEXT_TO_3D` if you need prompt-based generation.

## Task Status

| Status | Description |
|--------|-------------|
| `PENDING` | Waiting to start |
| `PROCESSING` | Generation in progress |
| `SUCCEEDED` | Complete with results |
| `FAILED` | Generation failed |
| `CANCELED` | User cancelled |

## Provider Options

### Tripo

#### Model Versions

| Version | Speed | Quality | Notes |
|---------|-------|---------|-------|
| `Turbo-v1.0-20250506` | ~10s | Good | Fast prototyping |
| `v3.0-20250812` | ~60s | Best | Supports `geometry_quality` for Ultra version|
| `v2.5-20250123` | ~45s | High | Balanced |
| `v2.0-20240919` | ~45s | High | Stable,Fast |
| `v1.4-20240625` | ~40s | Medium | Legacy |

#### TEXT_TO_3D / IMAGE_TO_3D Parameters

| Parameter | Type | Default | Versions | Description |
|-----------|------|---------|----------|-------------|
| `model_version` | string | v2.5-20250123 | All | Model version |
| `pbr` | boolean | true | All | Enable PBR materials |
| `texture` | boolean | true | All | Enable texturing |
| `texture_quality` | `'standard'` \| `'detailed'` | standard | All | Texture resolution |
| `texture_alignment` | `'original_image'` \| `'geometry'` | original_image| v2.0+ | Texture alignment |
| `texture_seed` | number | random | v2.0+ | Reproducible textures |
| `face_limit` | number | - | All | Max face count |
| `quad` | boolean | false | v2.0+ | Quad mesh (forces FBX) |
| `geometry_quality` | `'standard'` \| `'detailed'` | standard | **v3.0+ only** | Geometry detail level |
| `auto_size` | boolean | false | v2.0+ | Real-world scale (meters) |
| `orientation` | `'default'` \| `'align_image'` | default | v2.0+ | Model orientation |
| `model_seed` | number | random | v2.0+ | Reproducible geometry |
| `smart_low_poly` | boolean | false | v2.0+ | Hand-crafted low-poly topology |
| `generate_parts` | boolean | false | v2.0+ | Generate segmented parts |
| `compress` | `'geometry'` | - | v2.0+ | Apply meshopt compression |
| `enable_image_autofix` | boolean | false | All | Optimize input image |
| `negative_prompt` | string | - | Text only | Reverse direction prompt |
| `image_seed` | number | random | Text only | Seed for prompt processing |

#### RIG Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `skeleton` | string | `'biped'`, `'quadruped'`, `'hexapod'`, `'octopod'`, `'avian'`, `'serpentine'`, `'aquatic'` | Skeleton type |
| `outFormat` | string | `'glb'`, `'fbx'` | Output format |

**Additional `providerOptions`** for RIG:

| Parameter | Type | Description |
|-----------|------|-------------|
| `model_version` | string | `'v2.0-20250506'` or `'v1.0-20240301'` (default) |
| `spec` | string | Rigging method: `'tripo'` (default) or `'mixamo'` |

#### ANIMATE Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `animation` | string | Animation preset (e.g., `'preset:walk'`, `'preset:run'`, `'preset:idle'`) |
| `outFormat` | string | `'glb'` or `'fbx'` |
| `animateInPlace` | boolean | Animate in fixed place (default: false) |

**Additional `providerOptions`** for ANIMATE:

| Parameter | Type | Description |
|-----------|------|-------------|
| `bake_animation` | boolean | Bake animation into model (default: true) |
| `export_with_geometry` | boolean | Include geometry in output (default: true) |
| `animations` | string[] | Array of presets (max 5) |

#### TEXTURE Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | string | Texture description |
| `styleImage` | string | Style reference image URL |
| `enablePBR` | boolean | Enable PBR materials |

**Additional `providerOptions`** for TEXTURE:

| Parameter | Type | Description |
|-----------|------|-------------|
| `texture_seed` | number | Reproducible textures |
| `texture_alignment` | string | `'original_image'` or `'geometry'` |
| `texture_quality` | string | `'standard'` or `'detailed'` |
| `part_names` | string[] | Parts from segmentation |
| `compress` | string | `'geometry'` for meshopt |
| `model_version` | string | `'v2.5-20250123'`, `'v3.0-20250812'` |
| `bake` | boolean | Bake material effects (default: true) |

#### DECIMATE Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetFaceCount` | number | Target polygon count (1000-16000) |
| `quad` | boolean | Generate quad mesh |
| `bake` | boolean | Bake textures (default: true) |

**Additional `providerOptions`** for DECIMATE:

| Parameter | Type | Description |
|-----------|------|-------------|
| `model_version` | string | `'P-v1.0-20250506'` |
| `part_names` | string[] | Parts from segmentation |

#### CONVERT Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `format` | string | Target: `'gltf'`, `'glb'`, `'fbx'`, `'obj'`, `'usdz'`, `'stl'`, `'3mf'` |
| `quad` | boolean | Enable quad remeshing |
| `faceLimit` | number | Face count limit (default: 10000) |
| `textureSize` | number | Texture size in pixels |
| `scaleFactor` | number | Object scale (default: 1) |

**Additional `providerOptions`** for CONVERT (passed directly to Tripo API):

| Parameter | Type | Description |
|-----------|------|-------------|
| `force_symmetry` | boolean | Force symmetry (only when quad=true) |
| `flatten_bottom` | boolean | Flatten the bottom of model |
| `flatten_bottom_threshold` | number | Bottom flatten depth (default: 0.01) |
| `texture_format` | string | `'JPEG'`, `'PNG'`, `'WEBP'`, etc. |
| `pivot_to_center_bottom` | boolean | Set pivot to center bottom |
| `with_animation` | boolean | Include skeletal binding (default: true) |
| `pack_uv` | boolean | Combine UV islands into one layout |
| `bake` | boolean | Bake textures (default: true) |
| `export_vertex_colors` | boolean | Include vertex colors (OBJ/GLTF only) |
| `export_orientation` | string | Model facing: `'+x'`, `'-x'`, `'+y'`, `'-y'` |
| `fbx_preset` | string | Target: `'blender'`, `'3dsmax'`, `'mixamo'` |

#### Using providerOptions

For any provider-specific parameters not exposed as explicit props, use `providerOptions`. These are passed directly to the provider API:

```typescript
createTask({
  type: TaskType.CONVERT,
  taskId: 'original-id',
  format: 'fbx',
  providerOptions: {
    export_orientation: '+y',
    pack_uv: true,
    fbx_preset: 'mixamo',
    // Any Tripo API param works here
  }
});
```

#### Example

```typescript
// Text-to-3D with v3.0 features
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a futuristic robot',
  providerOptions: {
    model_version: 'v3.0-20250812',
    pbr: true,
    texture_quality: 'detailed',
    geometry_quality: 'detailed',  // v3.0+ only
    face_limit: 50000
  }
});

// Rigging
createTask({
  type: TaskType.RIG,
  taskId: 'original-task-id',
  skeleton: 'biped',
  outFormat: 'fbx'
});

// Animation
createTask({
  type: TaskType.ANIMATE,
  taskId: 'rigged-task-id',
  animation: 'preset:walk',
  outFormat: 'glb'
});
```

---

### Hunyuan (Tencent Cloud)

#### Versions

| Version | Concurrency | Max Faces | Speed | Use Case |
|---------|-------------|-----------|-------|----------|
| **Professional (Pro)** | 3 | 1,500,000 | ~120s | High-quality production |
| **Rapid** | 1 | - | ~30s | Fast prototyping |

#### TEXT_TO_3D / IMAGE_TO_3D Parameters (Professional)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `EnablePBR` | boolean | false | Enable PBR materials |
| `FaceCount` | number | 500,000 | Face count (40,000 - 1,500,000) |
| `GenerateType` | string | `'Normal'` | Generation mode (see below) |
| `PolygonType` | `'triangle'` \| `'quadrilateral'` | triangle | Mesh type (LowPoly only) |

#### TEXT_TO_3D / IMAGE_TO_3D Parameters (Rapid)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `EnablePBR` | boolean | false | Enable PBR materials |
| `EnableGeometry` | boolean | false | White model without texture |
| `ResultFormat` | string | `'OBJ'` | Output: `'OBJ'`, `'GLB'`, `'STL'`, `'USDZ'`, `'FBX'`, `'MP4'` |

#### GenerateType Values (Professional)

| Value | Description | Notes |
|-------|-------------|-------|
| `'Normal'` | Standard textured model | Default |
| `'LowPoly'` | Optimized low-poly | Supports `PolygonType` |
| `'Geometry'` | White model (no texture) | `EnablePBR` ignored |
| `'Sketch'` | From sketch/line art | Can combine with `prompt` |

#### TEXTURE Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | string | Texture description (optional) |
| `EnablePBR` | boolean | Enable PBR materials |

#### DECIMATE Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `FaceLevel` | string | `'high'`, `'medium'`, `'low'` | Reduction level |
| `PolygonType` | string | `'triangle'`, `'quadrilateral'` | Output mesh type |

#### UV_UNWRAP Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `modelUrl` | string | 3D file URL (FBX, OBJ, GLB) |

#### SEGMENT Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `modelUrl` | string | 3D file URL (FBX only) |

#### CONVERT Parameters (Sync)

| Parameter | Type | Values |
|-----------|------|--------|
| `format` | string | `'STL'`, `'USDZ'`, `'FBX'`, `'MP4'`, `'GIF'` |

#### Using providerOptions (Hunyuan)

Similar to Tripo, use `providerOptions` for provider-specific parameters:

```typescript
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a cute cat',
  providerOptions: {
    EnablePBR: true,
    FaceCount: 500000,
    GenerateType: 'Normal'
    // Any Hunyuan API param works here
  }
});
```

#### Example

```typescript
// Professional: High-quality generation
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a cute cat',  // Chinese prompts work well
  providerOptions: {
    EnablePBR: true,
    FaceCount: 500000,
    GenerateType: 'Normal'
  }
});

// Professional: LowPoly with quad mesh
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a cute rabbit',
  providerOptions: {
    GenerateType: 'LowPoly',
    PolygonType: 'quadrilateral'
  }
});

// Rapid: Fast generation with specific format
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a simple chair',
  providerOptions: {
    ResultFormat: 'GLB',
    EnablePBR: true
  }
});

// Decimate: Reduce polygon count
createTask({
  type: TaskType.DECIMATE,
  taskId: 'original-task-id',
  providerOptions: {
    FaceLevel: 'low',
    PolygonType: 'triangle'
  }
});
```

## Error Handling

The SDK provides two custom error classes for different error scenarios:

### Error Classes

```typescript
import { TaskError, ApiError } from 'magi-3d/server';

// TaskError - Thrown when a task fails during polling
// Contains the full StandardTask with error details
try {
  const result = await client.pollUntilDone(taskId);
} catch (error) {
  if (error instanceof TaskError) {
    console.log('Error code:', error.code);           // e.g., 'CONTENT_POLICY_VIOLATION'
    console.log('Task:', error.task);                 // Full StandardTask object
    console.log('Raw response:', error.task.error?.raw);  // Provider's raw response
  }
}

// ApiError - Thrown when API request fails (auth, validation, network)
// Contains code, httpStatus, and raw provider response
try {
  const taskId = await client.createTask(params);
} catch (error) {
  if (error instanceof ApiError) {
    console.log('Error code:', error.code);      // e.g., 'RATE_LIMIT_EXCEEDED'
    console.log('HTTP status:', error.httpStatus);  // e.g., 429
    console.log('Raw response:', error.raw);     // Provider's raw response
  }
}
```

### StandardTask.error Structure

```typescript
// When task.status === FAILED or CANCELED
{
  code: string;      // e.g., 'CONTENT_POLICY_VIOLATION', 'RATE_LIMIT_EXCEEDED'
  message: string;   // Human-readable error message
  raw: unknown;      // Original provider response for debugging
}
```

### Tripo Error Handling

Tripo errors are identified by HTTP status code + Tripo error code:

| Range | HTTP Status | Type |
|-------|-------------|------|
| 1000-1999 | 400-499 (1000/1001: 500) | Request errors |
| 2000-2999 | 400-499 | Task generation errors |

#### Tripo Error Codes

| Tripo Code | SDK Error Code | HTTP | Description |
|------------|----------------|------|-------------|
| 1000 | SERVER_ERROR | 500 | Server error |
| 1001 | FATAL_SERVER_ERROR | 500 | Fatal server error |
| 2000 | RATE_LIMIT_EXCEEDED | 429 | Rate limit hit |
| 2001 | TASK_NOT_FOUND | 404 | Invalid task ID |
| 2002 | UNSUPPORTED_TASK_TYPE | 400 | Invalid task type |
| 2003 | INPUT_FILE_EMPTY | 400 | No input file |
| 2004 | UNSUPPORTED_FILE_TYPE | 400 | Bad file format |
| 2006 | INVALID_ORIGINAL_TASK | 400 | Bad original task |
| 2007 | ORIGINAL_TASK_NOT_SUCCESS | 400 | Original task not done |
| 2008 | CONTENT_POLICY_VIOLATION | 400 | Content banned |
| 2010 | INSUFFICIENT_CREDITS | 403 | No credits |
| 2015 | DEPRECATED_VERSION | 400 | Version deprecated |
| 2018 | MODEL_TOO_COMPLEX | 400 | Cannot remesh |

#### Task Status Error Codes

When polling returns `status: failed/banned/expired/cancelled`, the SDK reads `error_code` from response:

| Status | Fallback SDK Code | Message |
|--------|-------------------|---------|
| failed | GENERATION_FAILED | Model generation failed |
| banned | CONTENT_POLICY_VIOLATION | Content policy violation |
| expired | TASK_EXPIRED | Task expired |
| cancelled | TASK_CANCELED | Task was cancelled |

### Hunyuan Error Handling

Hunyuan uses Tencent Cloud Common Error Codes:

| Hunyuan Code | SDK Error Code | Type |
|--------------|----------------|------|
| AuthFailure.SignatureExpire | SIGNATURE_EXPIRED | Auth |
| AuthFailure.SignatureFailure | SIGNATURE_FAILURE | Auth |
| AuthFailure.SecretIdNotFound | SECRET_ID_NOT_FOUND | Auth |
| InvalidParameter | INVALID_PARAMETER | Param |
| MissingParameter | MISSING_PARAMETER | Param |
| RequestLimitExceeded | RATE_LIMIT_EXCEEDED | Rate |
| ResourceNotFound | RESOURCE_NOT_FOUND | Resource |
| InternalError | INTERNAL_ERROR | Service |
| ServiceUnavailable | SERVICE_UNAVAILABLE | Service |

### Usage Example

```typescript
import { TaskError, ApiError, TaskStatus } from 'magi-3d/server';

// Server-side with proper error handling
try {
  const taskId = await client.createTask(params);
  const result = await client.pollUntilDone(taskId);
  console.log('Model URL:', result.result?.modelGlb);
} catch (error) {
  if (error instanceof TaskError) {
    // Task failed during generation
    console.log('Task failed:', error.code);
    console.log('Raw response:', error.task.error?.raw);
  } else if (error instanceof ApiError) {
    // API request failed (auth, validation, etc.)
    console.log('API error:', error.code, error.httpStatus);
    console.log('Raw response:', error.raw);
  }
}

// React hooks
const { task, error } = useCreateTask({ api: '/api/3d' });

if (task?.error) {
  switch (task.error.code) {
    case 'CONTENT_POLICY_VIOLATION':
      showAlert('Content was flagged. Please modify and retry.');
      break;
    case 'INSUFFICIENT_CREDITS':
      showAlert('Please purchase more credits.');
      break;
    default:
      showAlert(task.error.message);
  }
}
```

---

## TypeScript Support

Full TypeScript support with detailed type definitions:

```typescript
import {
  // Error classes
  TaskError,         // Thrown when task fails during polling
  ApiError,          // Thrown when API request fails

  // Types
  type TaskParams,
  type StandardTask,
  type TaskArtifacts,
  type TripoOptions,
  type HunyuanOptions
} from 'magi-3d/server';

import type {
  UseCreateTaskOptions,
  UseCreateTaskReturn
} from 'magi-3d/react';
```

## E2E Testing

```bash
# Setup
cp .env.example .env
# Edit .env with your API keys

# Run tests
pnpm test:tripo      # Quick Tripo test
pnpm test:hunyuan    # Quick Hunyuan test
pnpm test:tripo all  # Full Tripo test suite
```

See `scripts/test-guidelines.md` for detailed test documentation.

## Requirements

- Node.js >= 18.0.0 (for server-side)
- React >= 17.0.0 (for hooks, optional peer dependency)

## License

MIT

## Support

- Issues: [GitHub Issues](https://github.com/funmagic-ai/magi-3d-sdk/issues)
- Email: support@funmagic.ai

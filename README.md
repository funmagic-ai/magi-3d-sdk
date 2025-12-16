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

The SDK follows a similar pattern to Vercel AI SDK:

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

**Supported Task Types:**
- `TEXT_TO_3D` - Generate from text prompt
- `IMAGE_TO_3D` - Generate from image URL or base64
- `TEXTURE` - Add texture to geometry
- `DECIMATE` - Reduce face count
- `CONVERT` - Format conversion

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
| `TEXTURE` | Re-texture model | `taskId`, `prompt` |
| `REFINE` | Improve quality | `taskId` |
| `DECIMATE` | Reduce polygons | `taskId`, `targetFaceCount` |
| `CONVERT` | Format conversion | `taskId`, `format` |

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
| `model_version` | string | latest | All | Model version |
| `pbr` | boolean | true | All | Enable PBR materials |
| `texture` | boolean | true | All | Enable texturing |
| `texture_quality` | `'standard'` \| `'detailed'` | standard | All | Texture resolution |
| `texture_alignment` | `'original_image'` \| `'geometry'` | - | v2.0+ | Texture alignment |
| `texture_seed` | number | random | v2.0+ | Reproducible textures |
| `face_limit` | number | - | All | Max face count |
| `quad` | boolean | false | v2.0+ | Quad mesh (forces FBX) |
| `geometry_quality` | `'standard'` \| `'detailed'` | standard | **v3.0+ only** | Geometry detail level |
| `auto_size` | boolean | false | v2.0+ | Real-world scale (meters) |
| `orientation` | `'default'` \| `'align_image'` | default | v2.0+ | Model orientation |
| `model_seed` | number | random | v2.0+ | Reproducible geometry |

#### RIG Parameters

| Parameter | Type | Values | Description |
|-----------|------|--------|-------------|
| `skeleton` | string | `'biped'`, `'quadruped'`, `'hexapod'`, `'octopod'`, `'avian'`, `'serpentine'`, `'aquatic'` | Skeleton type |
| `outFormat` | string | `'glb'`, `'fbx'` | Output format |

#### ANIMATE Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `animation` | string | Animation preset (e.g., `'preset:walk'`, `'preset:run'`, `'preset:idle'`) |
| `outFormat` | string | `'glb'` or `'fbx'` |

#### TEXTURE Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | string | Texture description |
| `enablePBR` | boolean | Enable PBR materials |

#### DECIMATE Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `targetFaceCount` | number | Target polygon count |

#### CONVERT Parameters

| Parameter | Type | Values |
|-----------|------|--------|
| `format` | string | `'glb'`, `'fbx'`, `'usdz'`, `'obj'`, `'stl'` |

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

#### CONVERT Parameters (Sync)

| Parameter | Type | Values |
|-----------|------|--------|
| `format` | string | `'STL'`, `'USDZ'`, `'FBX'`, `'MP4'`, `'GIF'` |

#### Example

```typescript
// Professional: High-quality generation
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: '一只可爱的猫',  // Chinese prompts work well
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

## TypeScript Support

Full TypeScript support with detailed type definitions:

```typescript
import type {
  TaskParams,
  StandardTask,
  TaskArtifacts,
  TripoOptions,
  HunyuanOptions
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

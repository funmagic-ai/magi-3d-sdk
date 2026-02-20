# Magi 3D SDK

Universal TypeScript SDK for 3D generative AI providers. Generate 3D models from text or images using a unified API across multiple providers.

## Features

- **Multi-provider support**: Tripo, Hunyuan (Tencent Cloud)
- **Unified API**: Single `createTask()` method for all 16 task types
- **React Hooks**: `useCreateTask`, `useTaskStatus` with automatic polling
- **Provider metadata**: `PROVIDERS` list and `PROVIDER_TASK_TYPES` mapping for UI
- **TypeScript-first**: Full type safety and IntelliSense
- **Modern**: ESM + CJS, tree-shakeable

## Installation

```bash
npm install magi-3d
# or
pnpm add magi-3d
```

## Architecture

```
+------------------------------------------------------------------+
|  FRONTEND (React)                                                 |
|  -----------------                                                |
|  import { useCreateTask, PROVIDERS, PROVIDER_TASK_TYPES }         |
|           from 'magi-3d/react';                                   |
|                                                                   |
|  Hook handles:                                                    |
|    POST /api/3d/task           -> submit task with providerId     |
|    GET  /api/3d/task/:id       -> poll status with providerId     |
+----------------------------------+--------------------------------+
                                   |
                                   v
+------------------------------------------------------------------+
|  BACKEND (Your API Routes)                                        |
|  ---------------------------------------------------------------- |
|  import { Magi3DClient, TripoProvider } from 'magi-3d/server';    |
|                                                                   |
|  POST /api/3d/task      -> select provider, client.createTask()   |
|  GET  /api/3d/task/:id  -> select provider, client.getTask(id)    |
+------------------------------------------------------------------+
```

## Quick Start

### Backend: Create API Routes

```typescript
// app/api/3d/task/route.ts (Next.js App Router)
import { Magi3DClient, TripoProvider, HunyuanProvider, ProviderId } from 'magi-3d/server';

const providers = {
  [ProviderId.TRIPO]: new TripoProvider(),  // Uses TRIPO_API_KEY
  [ProviderId.HUNYUAN]: new HunyuanProvider({ region: 'ap-guangzhou' })  // Uses HUNYUAN_SECRET_ID/KEY
};

export async function POST(req: Request) {
  const { providerId = ProviderId.TRIPO, ...params } = await req.json();
  const provider = providers[providerId as ProviderId];
  if (!provider) return Response.json({ error: 'Invalid provider' }, { status: 400 });

  const client = new Magi3DClient(provider);
  const taskId = await client.createTask(params);
  return Response.json({ taskId });
}
```

### Frontend: React Hook

```tsx
'use client';
import { useCreateTask, TaskType, TaskStatus, ProviderId } from 'magi-3d/react';

export function Model3DGenerator() {
  const { createTask, task, isLoading, progress, error, reset } = useCreateTask({
    api: '/api/3d',
    onSuccess: (task) => console.log('Model URL:', task.result?.model)
  });

  return (
    <div>
      <button
        onClick={() => createTask({
          type: TaskType.TEXT_TO_3D,
          prompt: 'a medieval sword',
          providerId: ProviderId.TRIPO
        })}
        disabled={isLoading}
      >
        {isLoading ? `Generating (${progress}%)` : 'Generate 3D Model'}
      </button>

      {task?.status === TaskStatus.SUCCEEDED && (
        <a href={task.result?.model} download>Download Model</a>
      )}
      {error && <p>Error: {error.message}</p>}
    </div>
  );
}
```

### Direct Usage (Node.js / Scripts)

```typescript
import { Magi3DClient, TripoProvider, TaskType } from 'magi-3d/server';

const provider = new TripoProvider(); // Uses TRIPO_API_KEY env var
const client = new Magi3DClient(provider);

const taskId = await client.createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a medieval sword'
});

const result = await client.pollUntilDone(taskId, {
  onProgress: (task) => console.log(`${task.progress}%`)
});

console.log('Model URL:', result.result?.model);
```

## Supported Providers

### Tripo

```typescript
import { TripoProvider } from 'magi-3d/server';

const provider = new TripoProvider();  // Uses TRIPO_API_KEY env var
// or: new TripoProvider({ apiKey: '...', stsUpload: true })
```

### Hunyuan (Tencent Cloud)

```typescript
import { HunyuanProvider } from 'magi-3d/server';

const provider = new HunyuanProvider({ region: 'ap-guangzhou' });
// Uses HUNYUAN_SECRET_ID and HUNYUAN_SECRET_KEY env vars
```

## Task Types

| Type | Description | Tripo | Hunyuan |
|------|-------------|:-----:|:-------:|
| `TEXT_TO_3D` | Generate from text | Yes | Yes |
| `IMAGE_TO_3D` | Generate from image | Yes | Yes |
| `MULTIVIEW_TO_3D` | Generate from multiple views | Yes | Yes |
| `TEXT_TO_IMAGE` | Generate image from text | Yes | - |
| `GENERATE_IMAGE` | Advanced image generation | Yes | - |
| `TEXTURE` | Re-texture model | Yes | Yes |
| `REFINE` | Improve quality | Yes | - |
| `PRE_RIG_CHECK` | Check riggability | Yes | - |
| `RIG` | Add skeleton rigging | Yes | - |
| `ANIMATE` | Apply animation | Yes | - |
| `SEGMENT` | Split into parts | Yes | Yes |
| `MESH_COMPLETION` | Complete mesh parts | Yes | - |
| `DECIMATE` | Reduce polygons | Yes | Yes |
| `UV_UNWRAP` | UV unwrap | - | Yes |
| `PROFILE_TO_3D` | Face photo to 3D | - | Yes |
| `CONVERT` | Format conversion | Yes | Yes |
| `IMPORT` | Import external model | Yes | - |
| `STYLIZE` | Apply artistic style | Yes | - |

## StandardTask Response

All providers return this normalized format:

```typescript
interface StandardTask {
  id: string;
  provider: 'tripo' | 'hunyuan';
  type: TaskType;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'TIMEOUT' | 'CANCELED';
  progress: number;           // 0-100
  progressDetail?: string;    // Raw provider status

  result?: {
    model: string;            // Primary model URL - always use this
    modelGlb?: string;
    modelPbr?: string;
    modelBase?: string;
    modelFbx?: string;
    modelObj?: string;
    modelUsdz?: string;
    thumbnail?: string;
    video?: string;
    generatedImage?: string;  // For TEXT_TO_IMAGE / GENERATE_IMAGE
    riggable?: boolean;       // For PRE_RIG_CHECK
    rigType?: string;         // For PRE_RIG_CHECK
  };

  error?: { code: string; message: string; raw?: unknown; };
  rawResponse?: unknown;      // Full provider API response
  createdAt: number;
  finishedAt?: number;
}
```

## Environment Variables

| Variable | Provider | Description |
|----------|----------|-------------|
| `TRIPO_API_KEY` | Tripo | API key |
| `HUNYUAN_SECRET_ID` | Hunyuan | Tencent Cloud Secret ID |
| `HUNYUAN_SECRET_KEY` | Hunyuan | Tencent Cloud Secret Key |

## Documentation

- [React Hooks Guide](docs/guides/react-hooks.md) - Complete examples and hook API reference
- [Provider Options](docs/guides/provider-options.md) - All provider options, task chaining, STS upload
- [Error Handling](docs/guides/error-handling.md) - Error classes and all error codes
- [SDK Architecture](docs/sdk-design.md) - Design decisions and internals
- [API Reference](docs/) - TypeDoc-generated API docs

## TypeScript Imports

```typescript
// Server-side
import {
  Magi3DClient, TripoProvider, HunyuanProvider,
  TaskError, ApiError,
  type TaskParams, type StandardTask, type TripoOptions, type HunyuanOptions
} from 'magi-3d/server';

// React
import {
  useCreateTask, useTaskStatus,
  PROVIDERS, PROVIDER_TASK_TYPES,
  TaskType, TaskStatus, ProviderId
} from 'magi-3d/react';
```

## Requirements

- Node.js >= 18.0.0 (server-side)
- React >= 17.0.0 (hooks, optional peer dependency)

## License

MIT

## Support

- Issues: [GitHub Issues](https://github.com/funmagic-ai/magi-3d-sdk/issues)
- Email: support@funmagic.ai

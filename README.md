# Magi 3D SDK

Universal TypeScript SDK for 3D generative AI providers. Generate 3D models from text or images using a unified API across multiple providers.

## Features

- **Multi-provider support**: Tripo, Hunyuan (more coming soon)
- **Unified API**: Same interface across all providers
- **React Hooks**: `useGenerate3D`, `useTaskStatus`, `usePostProcess`
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
│  FRONTEND (React)                                                │
│  ─────────────────                                               │
│  import { useGenerate3D } from 'magi-3d/react';                 │
│                                                                  │
│  Hook handles:                                                   │
│    POST /api/3d/generate  →  submit task                        │
│    GET  /api/3d/task/:id  →  poll status                        │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│  BACKEND (Your API Routes)                                       │
│  ───────────────────────────────────────────────────────────────│
│  import { TripoProvider } from 'magi-3d/server';                │
│                                                                  │
│  POST /api/3d/generate  → provider.generate(params)             │
│  GET  /api/3d/task/:id  → provider.getTaskStatus(id)            │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Backend: Create API Routes

Create API routes that use the SDK providers:

```typescript
// app/api/3d/generate/route.ts (Next.js example)
import { TripoProvider } from 'magi-3d/server';

const provider = new TripoProvider({
  apiKey: process.env.TRIPO_API_KEY!
});

export async function POST(req: Request) {
  const params = await req.json();
  const taskId = await provider.generate(params);
  return Response.json({ taskId });
}
```

```typescript
// app/api/3d/task/[taskId]/route.ts
import { TripoProvider } from 'magi-3d/server';

const provider = new TripoProvider({
  apiKey: process.env.TRIPO_API_KEY!
});

export async function GET(req: Request, { params }: { params: Promise<{ taskId: string }> }) {
  const { taskId } = await params;
  const task = await provider.getTaskStatus(taskId);
  return Response.json(task);
}
```

### 2. Frontend: Use React Hooks

```tsx
'use client';

import { useGenerate3D } from 'magi-3d/react';

export function TextTo3DGenerator() {
  const { generate, task, isLoading, progress, error } = useGenerate3D({
    api: '/api/3d',
    onSuccess: (task) => console.log('Done!', task.result?.modelGlb)
  });

  return (
    <div>
      <button
        onClick={() => generate({
          type: 'TEXT_TO_3D',
          prompt: 'a small cat'
        })}
        disabled={isLoading}
      >
        {isLoading ? `Generating (${progress}%)` : 'Generate'}
      </button>

      {task?.status === 'SUCCEEDED' && (
        <a href={task.result?.modelGlb} download>Download GLB</a>
      )}
    </div>
  );
}
```

## React Hooks

### `useGenerate3D`

Main hook for 3D generation tasks.

```tsx
import { useGenerate3D } from 'magi-3d/react';

const {
  generate,    // (params) => Promise<taskId>
  task,        // StandardTask | null
  taskId,      // string | null
  isLoading,   // boolean
  progress,    // number (0-100)
  error,       // Error | null
  reset,       // () => void
  stop         // () => void - stop polling
} = useGenerate3D({
  api: '/api/3d',           // Your backend endpoint
  pollingInterval: 3000,    // Poll every 3s (default)
  timeout: 300000,          // 5 min timeout (default)
  headers: {},              // Additional headers
  onProgress: (task) => {}, // Progress callback
  onSuccess: (task) => {},  // Success callback
  onError: (error) => {}    // Error callback
});
```

### `usePostProcess`

Hook for post-processing operations (conversion, rigging, etc.).

```tsx
import { usePostProcess } from 'magi-3d/react';

const { postProcess, task, isLoading, progress, error } = usePostProcess({
  api: '/api/3d'
});

// Convert to FBX
postProcess({
  action: 'CONVERT',
  taskId: originalTaskId,
  format: 'fbx'
});

// Add rigging
postProcess({
  action: 'RIG',
  taskId: originalTaskId
});
```

### `useTaskStatus`

Hook for polling an existing task's status.

```tsx
import { useTaskStatus } from 'magi-3d/react';

const { task, isPolling, progress, startPolling, stopPolling } = useTaskStatus({
  api: '/api/3d',
  onComplete: (task) => console.log('Done!')
});

// Start polling a specific task
startPolling('task-id-here');
```

## Server Providers

### TripoProvider

Direct integration with Tripo AI API.

```typescript
import { TripoProvider } from 'magi-3d/server';

const provider = new TripoProvider({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.tripo3d.ai',  // optional
  timeout: 120000  // optional
});

// Generate
const taskId = await provider.generate({
  type: 'TEXT_TO_3D',
  prompt: 'a robot',
  providerOptions: {
    model_version: 'v2.5-20250123',
    pbr: true
  }
});

// Check status
const task = await provider.getTaskStatus(taskId);

// Post-process
const convertTaskId = await provider.postprocess({
  action: 'CONVERT',
  taskId,
  format: 'fbx'
});
```

## Task Types

- `TEXT_TO_3D`: Generate from text prompt
- `IMAGE_TO_3D`: Generate from single image
- `REFINE`: Refine existing model
- `RIGGING`: Add bone rigging

## Task Status

- `PENDING`: Waiting to start
- `PROCESSING`: Generation in progress
- `SUCCEEDED`: Complete with results
- `FAILED`: Generation failed
- `CANCELED`: User cancelled

## Post-Processing Actions

- `CONVERT`: Format conversion (GLB, USDZ, FBX, OBJ, STL)
- `RIG`: Add bone rigging
- `TEXTURE`: Re-texturing
- `REFINE`: Model refinement
- `DECIMATE`: Polygon reduction

## Provider-Specific Options

### Tripo Options

```typescript
{
  model_version?: 'Turbo-v1.0-20250506' | 'v3.0-20250812' | 'v2.5-20250123' | 'v2.0-20240919';
  pbr?: boolean;                    // Enable PBR materials
  texture?: boolean;                // Enable texturing
  texture_quality?: 'standard' | 'detailed';
  face_limit?: number;              // Face count limit
  quad?: boolean;                   // Quad mesh output
  auto_size?: boolean;              // Scale to real-world dimensions
}
```

## Examples

See `/examples` directory for:
- `nextjs-api-route.ts` - Next.js API route handlers
- `browser-react.tsx` - React component examples
- `node-basic.ts` - Node.js usage

## TypeScript Support

Full TypeScript support with detailed type definitions:

```typescript
import type {
  GenerateParams,
  StandardTask,
  TaskArtifacts,
  TripoOptions
} from 'magi-3d/server';

import type {
  UseGenerate3DOptions,
  UseGenerate3DReturn
} from 'magi-3d/react';
```

## Requirements

- Node.js >= 16.0.0 (for server-side)
- React >= 17.0.0 (for hooks)
- Modern browser with ES2020 support

## License

MIT

## Support

- Issues: [GitHub Issues](https://github.com/your-org/magi-3d-sdk/issues)
- Email: support@funmagic.ai

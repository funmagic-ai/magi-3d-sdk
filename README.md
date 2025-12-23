# Magi 3D SDK

Universal TypeScript SDK for 3D generative AI providers. Generate 3D models from text or images using a unified API across multiple providers.

## Features

- **Multi-provider support**: Tripo, Hunyuan (Tencent Cloud)
- **Unified API**: Single `createTask()` method for all operations
- **React Hooks**: `useCreateTask`, `useTaskStatus`, `usePolling`
- **Provider metadata**: `PROVIDERS` list and `PROVIDER_TASK_TYPES` mapping for UI
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

### 1. Backend: Create API Routes

```typescript
// app/api/3d/task/route.ts (Next.js App Router)
import { Magi3DClient, TripoProvider, HunyuanProvider, ProviderId } from 'magi-3d/server';

// Create provider instances (uses env vars by default)
const providers = {
  [ProviderId.TRIPO]: new TripoProvider(),  // Uses TRIPO_API_KEY
  [ProviderId.HUNYUAN]: new HunyuanProvider({ region: 'ap-guangzhou' })  // Uses HUNYUAN_SECRET_ID/KEY
};

// Create task
export async function POST(req: Request) {
  const { providerId = ProviderId.TRIPO, ...params } = await req.json();

  const provider = providers[providerId as ProviderId];
  if (!provider) {
    return Response.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const client = new Magi3DClient(provider);
  const taskId = await client.createTask(params);
  return Response.json({ taskId });
}

// app/api/3d/task/[id]/route.ts
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const providerId = searchParams.get('providerId') as ProviderId;

  const provider = providers[providerId];
  if (!provider) {
    return Response.json({ error: 'Invalid provider' }, { status: 400 });
  }

  const client = new Magi3DClient(provider);
  const task = await client.getTask(params.id);
  return Response.json(task);
}
```

### 2. Frontend: Complete React Hooks Example

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  useCreateTask,
  useTaskStatus,
  PROVIDERS,
  PROVIDER_TASK_TYPES,
  TaskType,
  TaskStatus,
  ProviderId
} from 'magi-3d/react';

// ============================================
// Example 1: Create Task with Provider Selection
// ============================================
export function Model3DGenerator() {
  // Provider and task type selection
  const [providerId, setProviderId] = useState<ProviderId>(ProviderId.TRIPO);
  const [taskType, setTaskType] = useState<TaskType>(TaskType.TEXT_TO_3D);
  const [prompt, setPrompt] = useState('');

  // Get available task types for selected provider
  const availableTaskTypes = PROVIDER_TASK_TYPES[providerId];

  // Reset task type when provider changes if current type not supported
  useEffect(() => {
    if (!availableTaskTypes.includes(taskType)) {
      setTaskType(availableTaskTypes[0]);
    }
  }, [providerId, taskType, availableTaskTypes]);

  // Create task hook - handles creation and automatic polling
  const {
    createTask,
    task,
    taskId,
    isLoading,
    progress,
    error,
    reset
  } = useCreateTask({
    api: '/api/3d',
    onSuccess: (task) => {
      console.log('Model URL:', task.result?.model);  // Primary model URL
      console.log('Raw API Response:', task.rawResponse);  // Full provider response
    },
    onError: (err) => console.error('Generation failed:', err)
  });

  const handleSubmit = async () => {
    await createTask({
      type: taskType,
      prompt,
      providerId  // Backend uses this to select provider
    });
  };

  return (
    <div>
      <h2>3D Model Generator</h2>

      {/* Provider Selection - uses PROVIDERS export */}
      <div>
        <label>Provider:</label>
        <select
          value={providerId}
          onChange={(e) => setProviderId(e.target.value as ProviderId)}
          disabled={isLoading}
        >
          {PROVIDERS.map(id => (
            <option key={id} value={id}>{id.toUpperCase()}</option>
          ))}
        </select>
      </div>

      {/* Task Type Selection - uses PROVIDER_TASK_TYPES mapping */}
      <div>
        <label>Task Type:</label>
        <select
          value={taskType}
          onChange={(e) => setTaskType(e.target.value as TaskType)}
          disabled={isLoading}
        >
          {availableTaskTypes.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </div>

      {/* Prompt Input */}
      <div>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt..."
          disabled={isLoading}
        />
      </div>

      {/* Submit Button */}
      <button onClick={handleSubmit} disabled={isLoading || !prompt}>
        {isLoading ? `Generating (${progress}%)` : 'Generate 3D Model'}
      </button>

      {/* Progress Display */}
      {isLoading && (
        <div>
          <progress value={progress} max={100} />
          <span>{task?.progressDetail || 'Processing...'}</span>
        </div>
      )}

      {/* Result Display */}
      {task?.status === TaskStatus.SUCCEEDED && (
        <div>
          <p>Model ready!</p>
          <a href={task.result?.model} download>Download Model</a>
          {task.result?.thumbnail && (
            <img src={task.result.thumbnail} alt="Preview" />
          )}
        </div>
      )}

      {/* Error Display */}
      {error && <p style={{ color: 'red' }}>Error: {error.message}</p>}

      {/* Reset Button */}
      {(task || error) && !isLoading && (
        <button onClick={reset}>Start New</button>
      )}
    </div>
  );
}

// ============================================
// Example 2: Track Existing Task Status
// ============================================
interface TaskTrackerProps {
  taskId: string;
  providerId: ProviderId;
}

export function TaskTracker({ taskId, providerId }: TaskTrackerProps) {
  const {
    task,
    progress,
    isPolling,
    error,
    startPolling,
    stopPolling,
    refresh
  } = useTaskStatus({
    api: '/api/3d',
    providerId,  // Required - tells backend which provider to query
    pollingInterval: 3000,
    onComplete: (task) => {
      console.log('Task completed:', task.status);
      console.log('Model URL:', task.result?.model);
      console.log('Raw Response:', task.rawResponse);
    },
    onError: (err) => console.error('Polling error:', err)
  });

  // Start polling when component mounts
  useEffect(() => {
    if (taskId) {
      startPolling(taskId);
    }
    return () => stopPolling();
  }, [taskId, startPolling, stopPolling]);

  return (
    <div>
      <h3>Task: {taskId}</h3>
      <p>Provider: {providerId}</p>
      <p>Status: {task?.status || 'Loading...'}</p>
      <p>Progress: {progress}%</p>

      {task?.status === TaskStatus.SUCCEEDED && (
        <a href={task.result?.model} download>Download Model</a>
      )}

      {task?.status === TaskStatus.FAILED && (
        <p style={{ color: 'red' }}>Error: {task.error?.message}</p>
      )}

      <button onClick={refresh} disabled={isPolling}>
        Refresh
      </button>
    </div>
  );
}

// ============================================
// Example 3: Task History with Status Tracking
// ============================================
interface SavedTask {
  taskId: string;
  providerId: ProviderId;
  createdAt: number;
}

export function TaskHistory() {
  const [savedTasks, setSavedTasks] = useState<SavedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<SavedTask | null>(null);

  return (
    <div>
      <h2>Task History</h2>

      {/* List of saved tasks */}
      <ul>
        {savedTasks.map((saved) => (
          <li key={saved.taskId}>
            <button onClick={() => setSelectedTask(saved)}>
              {saved.taskId} ({saved.providerId})
            </button>
          </li>
        ))}
      </ul>

      {/* Track selected task status */}
      {selectedTask && (
        <TaskTracker
          taskId={selectedTask.taskId}
          providerId={selectedTask.providerId}
        />
      )}
    </div>
  );
}
```

### 3. Direct Usage (Node.js / Scripts)

```typescript
import { Magi3DClient, TripoProvider, TaskType } from 'magi-3d/server';

// Uses TRIPO_API_KEY env var by default
const provider = new TripoProvider();
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

console.log('Model URL:', result.result?.model);  // Primary model URL
console.log('Raw Response:', result.rawResponse);  // Full provider API response
```

## Supported Providers

### Tripo

```typescript
import { TripoProvider } from 'magi-3d/server';

// Option 1: Use environment variable (recommended)
const provider = new TripoProvider();  // Uses TRIPO_API_KEY

// Option 2: Explicit API key
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

// Option 1: Use environment variables (recommended)
const provider = new HunyuanProvider({
  region: 'ap-guangzhou'
});  // Uses HUNYUAN_SECRET_ID and HUNYUAN_SECRET_KEY

// Option 2: Explicit credentials
const provider = new HunyuanProvider({
  secretId: 'your-tencent-secret-id',
  secretKey: 'your-tencent-secret-key',
  region: 'ap-guangzhou'
});
```

**Progress Reporting:** Hunyuan API does not return granular progress percentages. The SDK estimates progress based on task status:
- `PENDING` (WAIT) -> 0%
- `PROCESSING` (RUN) -> 50%
- `SUCCEEDED` (DONE) -> 100%

The raw Hunyuan status is available in `task.progressDetail` for debugging.

**Supported Task Types:**
- `TEXT_TO_3D` - Generate from text prompt
- `IMAGE_TO_3D` - Generate from image URL or base64
- `MULTIVIEW_TO_3D` - Generate from multiple views (Pro only)
- `TEXTURE` - Add texture to geometry (requires `modelUrl`)
- `DECIMATE` - Reduce face count (requires `modelUrl`)
- `UV_UNWRAP` - UV Unwrap (requires `modelUrl`)
- `SEGMENT` - Component generation (requires `modelUrl`)
- `CONVERT` - Format conversion (sync)

> **Note:** Hunyuan post-processing tasks require `modelUrl` instead of `taskId`.

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
createTask({ type: TaskType.TEXT_TO_3D, prompt: 'a cat', providerId: ProviderId.TRIPO });

// Image-to-3D
createTask({ type: TaskType.IMAGE_TO_3D, input: 'https://...', providerId: ProviderId.HUNYUAN });

// Post-processing (rigging - Tripo)
createTask({ type: TaskType.RIG, taskId: 'original-id', skeleton: 'biped' });

// Format conversion
createTask({ type: TaskType.CONVERT, taskId: 'original-id', format: 'fbx' });
```

### `useTaskStatus`

Track an existing task by ID. Requires `providerId` so the backend knows which provider to query.

```tsx
import { useTaskStatus, ProviderId } from 'magi-3d/react';

const {
  task,
  progress,
  isPolling,
  startPolling,
  stopPolling,
  refresh
} = useTaskStatus({
  api: '/api/3d',
  providerId: ProviderId.TRIPO,  // Required
  onComplete: (task) => console.log('Done!', task.result?.model)
});

// Start polling for existing task
startPolling('existing-task-id');
```

### Provider Metadata

```tsx
import { PROVIDERS, PROVIDER_TASK_TYPES, ProviderId, TaskType } from 'magi-3d/react';

// List all providers
console.log(PROVIDERS);  // ['tripo', 'hunyuan']

// Get task types for a provider
const tripoTypes = PROVIDER_TASK_TYPES[ProviderId.TRIPO];
// => [TaskType.TEXT_TO_3D, TaskType.IMAGE_TO_3D, TaskType.RIG, ...]

const hunyuanTypes = PROVIDER_TASK_TYPES[ProviderId.HUNYUAN];
// => [TaskType.TEXT_TO_3D, TaskType.IMAGE_TO_3D, TaskType.TEXTURE, ...]
```

## Task Types

All operations use a single `createTask()` method. The `type` field determines the operation:

| Type | Description | Required Params | Tripo | Hunyuan |
|------|-------------|-----------------|-------|---------|
| `TEXT_TO_3D` | Generate from text | `prompt` | Yes | Yes |
| `IMAGE_TO_3D` | Generate from image | `input` (URL or base64) | Yes | Yes |
| `MULTIVIEW_TO_3D` | Generate from views | `inputs` (array of URLs) | Yes | Yes |
| `RIG` | Add skeletal rigging | `taskId`, `skeleton` | Yes | No |
| `ANIMATE` | Apply animation | `taskId`, `animation` | Yes | No |
| `TEXTURE` | Re-texture model | `taskId` or `modelUrl` | Yes | Yes |
| `REFINE` | Improve quality | `taskId` | Yes | No |
| `DECIMATE` | Reduce polygons | `taskId` or `modelUrl` | Yes | Yes |
| `CONVERT` | Format conversion | `taskId`, `format` | Yes | Yes |

> **Note:** `IMAGE_TO_3D` and `MULTIVIEW_TO_3D` do not support text prompts. Use `TEXT_TO_3D` if you need prompt-based generation.

## StandardTask Response

All providers return this normalized format:

```typescript
interface StandardTask {
  id: string;
  provider: 'tripo' | 'hunyuan';
  type: TaskType;
  status: 'PENDING' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'CANCELED';
  progress: number;           // 0-100
  progressDetail?: string;    // Raw provider status

  result?: {
    model: string;            // Primary model URL - always use this
    modelGlb?: string;        // GLB URL (when format is known)
    modelPbr?: string;        // PBR model URL
    modelFbx?: string;
    modelObj?: string;
    thumbnail?: string;
    video?: string;
  };

  error?: {
    code: string;
    message: string;
    raw?: unknown;            // Provider's raw error
  };

  rawResponse?: unknown;      // Full provider API response for debugging

  createdAt: number;
  finishedAt?: number;
}
```

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
| `v2.0-20240919` | ~45s | High | Stable, Fast |
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

#### GenerateType Values (Professional)

| Value | Description | Notes |
|-------|-------------|-------|
| `'Normal'` | Standard textured model | Default |
| `'LowPoly'` | Optimized low-poly | Supports `PolygonType` |
| `'Geometry'` | White model (no texture) | `EnablePBR` ignored |
| `'Sketch'` | From sketch/line art | Can combine with `prompt` |

#### Example

```typescript
// Professional: High-quality generation
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a cute cat',
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

// Decimate: Reduce polygon count (requires modelUrl for Hunyuan)
createTask({
  type: TaskType.DECIMATE,
  modelUrl: 'https://example.com/model.glb',  // Not taskId!
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

### Usage Example

```typescript
import { TaskError, ApiError, TaskStatus } from 'magi-3d/server';

// Server-side with proper error handling
try {
  const taskId = await client.createTask(params);
  const result = await client.pollUntilDone(taskId);
  console.log('Model URL:', result.result?.model);
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

### Tripo Error Codes

| Tripo Code | SDK Error Code | HTTP | Description |
|------------|----------------|------|-------------|
| 1000 | `SERVER_ERROR` | 500 | Server error |
| 1001 | `FATAL_SERVER_ERROR` | 500 | Fatal server error |
| 2000 | `RATE_LIMIT_EXCEEDED` | 429 | Rate limit hit |
| 2001 | `TASK_NOT_FOUND` | 404 | Invalid task ID |
| 2002 | `UNSUPPORTED_TASK_TYPE` | 400 | Invalid task type |
| 2003 | `INPUT_FILE_EMPTY` | 400 | No input file |
| 2004 | `UNSUPPORTED_FILE_TYPE` | 400 | Bad file format |
| 2006 | `INVALID_ORIGINAL_TASK` | 400 | Bad original task |
| 2007 | `ORIGINAL_TASK_NOT_SUCCESS` | 400 | Original task not done |
| 2008 | `CONTENT_POLICY_VIOLATION` | 400 | Content banned |
| 2010 | `INSUFFICIENT_CREDITS` | 403 | No credits |
| 2015 | `DEPRECATED_VERSION` | 400 | Version deprecated |
| 2018 | `MODEL_TOO_COMPLEX` | 400 | Cannot remesh |

**Task Status Errors:**

| Status | SDK Code | Description |
|--------|----------|-------------|
| failed | `GENERATION_FAILED` | Model generation failed |
| banned | `CONTENT_POLICY_VIOLATION` | Content policy violation |
| expired | `TASK_EXPIRED` | Task expired |
| cancelled | `TASK_CANCELED` | Task was cancelled |

### Hunyuan Error Codes

| Hunyuan Code | SDK Error Code | Description |
|--------------|----------------|-------------|
| `AuthFailure.SignatureExpire` | `SIGNATURE_EXPIRED` | Signature expired |
| `AuthFailure.SignatureFailure` | `SIGNATURE_FAILURE` | Invalid signature |
| `AuthFailure.SecretIdNotFound` | `SECRET_ID_NOT_FOUND` | Secret ID not found |
| `InvalidParameter` | `INVALID_PARAMETER` | Invalid parameter |
| `MissingParameter` | `MISSING_PARAMETER` | Missing parameter |
| `RequestLimitExceeded` | `RATE_LIMIT_EXCEEDED` | Rate limit exceeded |
| `ResourceNotFound` | `RESOURCE_NOT_FOUND` | Resource not found |
| `FailedOperation.*` | `OPERATION_FAILED` | Operation failed (retry) |
| `InternalError` | `INTERNAL_ERROR` | Internal server error |
| `ServiceUnavailable` | `SERVICE_UNAVAILABLE` | Service unavailable |

**Task Status Errors:**

| Status | SDK Code | Description |
|--------|----------|-------------|
| FAILED | `GENERATION_FAILED` | Model generation failed |
| CANCELED | `TASK_CANCELED` | Task was cancelled |

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

import {
  // Provider metadata
  PROVIDERS,
  PROVIDER_TASK_TYPES,

  // Types
  type UseCreateTaskOptions,
  type UseCreateTaskReturn,
  type UseTaskStatusOptions,
  type UseTaskStatusReturn
} from 'magi-3d/react';
```

## Environment Variables

| Variable | Provider | Description |
|----------|----------|-------------|
| `TRIPO_API_KEY` | Tripo | API key for Tripo |
| `HUNYUAN_SECRET_ID` | Hunyuan | Tencent Cloud Secret ID |
| `HUNYUAN_SECRET_KEY` | Hunyuan | Tencent Cloud Secret Key |

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

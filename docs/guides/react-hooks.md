# React Hooks Guide

Complete guide for using Magi 3D React hooks to build 3D generation UIs.

## Installation

React hooks are available from the `magi-3d/react` entry point:

```tsx
import {
  useCreateTask,
  useTaskStatus,
  PROVIDERS,
  PROVIDER_TASK_TYPES,
  TaskType,
  TaskStatus,
  ProviderId
} from 'magi-3d/react';
```

React 17+ is required as an optional peer dependency.

## useCreateTask

Unified hook for creating tasks and automatically polling for results.

### API

```tsx
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
  api: '/api/3d',           // Base API path (required)
  pollingInterval: 3000,    // Polling interval in ms (default: 3000)
  timeout: 300000,          // Max wait time in ms (default: 300000)
  onProgress: (task) => {}, // Called on each poll cycle
  onSuccess: (task) => {},  // Called when task succeeds
  onError: (error) => {}    // Called on error
});
```

### Basic Usage

```tsx
// Text-to-3D
createTask({
  type: TaskType.TEXT_TO_3D,
  prompt: 'a cat',
  providerId: ProviderId.TRIPO
});

// Image-to-3D
createTask({
  type: TaskType.IMAGE_TO_3D,
  input: 'https://example.com/photo.jpg',
  providerId: ProviderId.HUNYUAN
});

// Post-processing
createTask({
  type: TaskType.RIG,
  taskId: 'original-id',
  skeleton: 'biped'
});

// Format conversion
createTask({
  type: TaskType.CONVERT,
  taskId: 'original-id',
  format: 'fbx'
});
```

## useTaskStatus

Track an existing task by ID. Requires `providerId` so the backend knows which provider to query.

### API

```tsx
const {
  task,          // StandardTask | null
  progress,      // number (0-100)
  isPolling,     // boolean
  error,         // Error | null
  startPolling,  // (taskId: string) => void
  stopPolling,   // () => void
  refresh        // () => void
} = useTaskStatus({
  api: '/api/3d',              // Base API path (required)
  providerId: ProviderId.TRIPO, // Provider to query (required)
  pollingInterval: 3000,       // Polling interval in ms (default: 3000)
  onComplete: (task) => {},    // Called when task reaches terminal state
  onError: (error) => {}       // Called on error
});

// Start polling for an existing task
startPolling('existing-task-id');
```

## Provider Metadata

Static exports for building provider selection UIs without backend calls:

```tsx
import { PROVIDERS, PROVIDER_TASK_TYPES, ProviderId, TaskType } from 'magi-3d/react';

// List all providers
console.log(PROVIDERS); // ['tripo', 'hunyuan']

// Get task types for a provider
const tripoTypes = PROVIDER_TASK_TYPES[ProviderId.TRIPO];
// => [TaskType.TEXT_TO_3D, TaskType.IMAGE_TO_3D, TaskType.RIG, ...]

const hunyuanTypes = PROVIDER_TASK_TYPES[ProviderId.HUNYUAN];
// => [TaskType.TEXT_TO_3D, TaskType.IMAGE_TO_3D, TaskType.TEXTURE, ...]
```

---

## Complete Examples

### Example 1: 3D Model Generator with Provider Selection

```tsx
'use client';

import { useState, useEffect } from 'react';
import {
  useCreateTask,
  PROVIDERS,
  PROVIDER_TASK_TYPES,
  TaskType,
  TaskStatus,
  ProviderId
} from 'magi-3d/react';

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
      console.log('Model URL:', task.result?.model);
      console.log('Raw API Response:', task.rawResponse);
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
```

### Example 2: Track Existing Task Status

```tsx
'use client';

import { useEffect } from 'react';
import { useTaskStatus, ProviderId, TaskStatus } from 'magi-3d/react';

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
```

### Example 3: Task History with Status Tracking

```tsx
'use client';

import { useState } from 'react';
import { ProviderId } from 'magi-3d/react';

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

## Backend API Routes (Next.js)

The React hooks expect these API routes:

```typescript
// app/api/3d/task/route.ts
import { Magi3DClient, TripoProvider, HunyuanProvider, ProviderId } from 'magi-3d/server';

const providers = {
  [ProviderId.TRIPO]: new TripoProvider(),
  [ProviderId.HUNYUAN]: new HunyuanProvider({ region: 'ap-guangzhou' })
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

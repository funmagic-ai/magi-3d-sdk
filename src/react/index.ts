/**
 * @module magi-3d/react
 *
 * React hooks for Magi 3D SDK.
 *
 * Use this module in your React frontend to create and track 3D generation tasks.
 * These hooks communicate with your backend API (created with `magi-3d/server`).
 *
 * ## Quick Start
 * ```tsx
 * import { useCreateTask, TaskType, TaskStatus } from 'magi-3d/react';
 *
 * function Generate3D() {
 *   const { createTask, task, isLoading, progress } = useCreateTask({
 *     api: '/api/3d',
 *     onSuccess: (task) => console.log('Model ready:', task.result?.modelGlb)
 *   });
 *
 *   return (
 *     <div>
 *       <button
 *         onClick={() => createTask({ type: TaskType.TEXT_TO_3D, prompt: 'a cat' })}
 *         disabled={isLoading}
 *       >
 *         {isLoading ? `Generating (${progress}%)` : 'Generate 3D Model'}
 *       </button>
 *
 *       {task?.status === TaskStatus.SUCCEEDED && (
 *         <model-viewer src={task.result?.modelGlb} />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 *
 * ## Available Hooks
 * - {@link useCreateTask} - Create and track new tasks (recommended)
 * - {@link useTaskStatus} - Track existing task by ID
 * - {@link usePolling} - Low-level polling hook
 *
 * @packageDocumentation
 */

// Polling hook
export { usePolling } from './usePolling';
export type { UsePollingOptions, UsePollingReturn } from './usePolling';

// Unified task creation hook
export { useCreateTask } from './useCreateTask';
export type { UseCreateTaskOptions, UseCreateTaskReturn } from './useCreateTask';

// Task status tracking hook
export { useTaskStatus } from './useTaskStatus';
export type { UseTaskStatusOptions, UseTaskStatusReturn } from './useTaskStatus';

// Re-export types that are useful for React components
export type {
  StandardTask,
  TaskArtifacts,
  TaskParams,
  TextTo3DParams,
  ImageTo3DParams,
  RigParams,
  ConvertParams,
  TextureParams,
  DecimateParams
} from '../types';

export {
  TaskStatus,
  TaskType,
  ProviderId,
  PROVIDERS,
  PROVIDER_TASK_TYPES
} from '../types';

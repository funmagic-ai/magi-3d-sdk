/**
 * @module react
 * @description React hooks for Magi 3D SDK
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
  TaskType
} from '../types';

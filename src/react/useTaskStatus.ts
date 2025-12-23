/**
 * @module react/useTaskStatus
 * @description React hook for polling existing task status
 */

import { useCallback } from 'react';
import { usePolling, UsePollingOptions } from './usePolling';
import type { StandardTask, ProviderId } from '../types';

export interface UseTaskStatusOptions extends Omit<UsePollingOptions, 'api' | 'onSuccess' | 'providerId'> {
  /**
   * API endpoint for 3D tasks
   * @default '/api/3d'
   */
  api?: string;

  /**
   * Provider ID for the task.
   * Required so the backend knows which provider to query for task status.
   */
  providerId: ProviderId;

  /**
   * Callback when task completes (any terminal state)
   */
  onComplete?: (task: StandardTask) => void;
}

export interface UseTaskStatusReturn {
  /** Current task state */
  task: StandardTask | null;
  /** Whether polling is active */
  isPolling: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Error if fetching failed */
  error: Error | null;
  /** Manually refresh task status */
  refresh: () => Promise<StandardTask | null>;
  /** Start polling for a task */
  startPolling: (taskId: string) => void;
  /** Stop polling */
  stopPolling: () => void;
}

/**
 * React hook for polling task status.
 *
 * Use this when you already have a taskId and providerId and want to track progress.
 * The hook calls your backend API with taskId and providerId, allowing the backend
 * to query the appropriate provider for task status.
 *
 * @example
 * ```tsx
 * import { useTaskStatus, ProviderId } from 'magi-3d/react';
 *
 * function TaskTracker({ taskId, providerId }: { taskId: string; providerId: ProviderId }) {
 *   const { task, progress, startPolling } = useTaskStatus({
 *     api: '/api/3d',
 *     providerId,
 *     onComplete: (task) => {
 *       console.log('Done!', task);
 *       // Developer can store task.rawResponse in DB if needed
 *     }
 *   });
 *
 *   useEffect(() => {
 *     if (taskId) startPolling(taskId);
 *   }, [taskId, startPolling]);
 *
 *   return <div>Progress: {progress}%</div>;
 * }
 * ```
 */
export function useTaskStatus(options: UseTaskStatusOptions): UseTaskStatusReturn {
  const {
    api = '/api/3d',
    providerId,
    onComplete,
    ...pollingOptions
  } = options;

  // Map onComplete to onSuccess for the shared hook
  const handleSuccess = useCallback((task: StandardTask) => {
    onComplete?.(task);
  }, [onComplete]);

  // Also call onComplete for failed/cancelled tasks
  const handleError = useCallback((error: Error) => {
    // The error callback is called for failures, but we also want onComplete
    // The polling hook already handles setting task state for terminal statuses
    pollingOptions.onError?.(error);
  }, [pollingOptions]);

  const polling = usePolling({
    api,
    providerId,
    onSuccess: handleSuccess,
    onError: handleError,
    ...pollingOptions
  });

  return {
    task: polling.task,
    isPolling: polling.isPolling,
    progress: polling.progress,
    error: polling.error,
    refresh: polling.refresh,
    startPolling: polling.startPolling,
    stopPolling: polling.stopPolling
  };
}

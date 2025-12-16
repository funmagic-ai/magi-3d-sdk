/**
 * @module react/useTaskStatus
 * @description React hook for polling existing task status
 */

import { useCallback } from 'react';
import { usePolling, UsePollingOptions } from './usePolling';
import type { StandardTask } from '../types';

export interface UseTaskStatusOptions extends Omit<UsePollingOptions, 'api' | 'onSuccess'> {
  /**
   * API endpoint for 3D tasks
   * @default '/api/3d'
   */
  api?: string;

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
 * React hook for polling task status
 *
 * Use this when you already have a taskId and want to track its progress.
 *
 * @example
 * ```tsx
 * import { useTaskStatus } from 'magi-3d/react';
 *
 * function TaskTracker({ taskId }: { taskId: string }) {
 *   const { task, progress, startPolling } = useTaskStatus({
 *     api: '/api/3d',
 *     onComplete: (task) => console.log('Done!', task)
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
export function useTaskStatus(options: UseTaskStatusOptions = {}): UseTaskStatusReturn {
  const {
    api = '/api/3d',
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

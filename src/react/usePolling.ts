/**
 * @module react/usePolling
 * @description Shared polling hook for React applications
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { StandardTask, TaskStatus } from '../types';

/**
 * Terminal task statuses that stop polling
 * @internal
 */
const TERMINAL_STATUSES: TaskStatus[] = [
  TaskStatus.SUCCEEDED,
  TaskStatus.FAILED,
  TaskStatus.CANCELED
];

/**
 * Configuration options for the polling hook.
 *
 * @example
 * ```typescript
 * const options: UsePollingOptions = {
 *   api: '/api/3d',
 *   pollingInterval: 2000,
 *   timeout: 300000,
 *   maxRetries: 5,
 *   onProgress: (task) => console.log(`Progress: ${task.progress}%`),
 *   onSuccess: (task) => console.log('Done!', task.result),
 *   onError: (error) => console.error('Failed:', error)
 * };
 * ```
 */
export interface UsePollingOptions {
  /**
   * Base API endpoint for task status requests.
   * The hook will fetch from `{api}/task/{taskId}`.
   */
  api: string;

  /**
   * Time between status checks in milliseconds.
   * @defaultValue 3000
   */
  pollingInterval?: number;

  /**
   * Maximum total wait time before timing out.
   * @defaultValue 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Maximum consecutive errors before stopping.
   * Resets to 0 after each successful fetch.
   * @defaultValue 5
   */
  maxRetries?: number;

  /**
   * Additional HTTP headers for requests.
   */
  headers?: Record<string, string>;

  /**
   * Called on each successful status fetch.
   * @param task - Current task status
   */
  onProgress?: (task: StandardTask) => void;

  /**
   * Called when task completes successfully (status = SUCCEEDED).
   * @param task - Completed task with results
   */
  onSuccess?: (task: StandardTask) => void;

  /**
   * Called on errors (task failure, timeout, max retries).
   * @param error - Error object with details
   */
  onError?: (error: Error) => void;
}

/**
 * Return value from the usePolling hook.
 */
export interface UsePollingReturn {
  /** Current task state (null if no task) */
  task: StandardTask | null;

  /** Current task ID being polled (null if not polling) */
  taskId: string | null;

  /** Whether polling is currently active */
  isPolling: boolean;

  /** Current progress percentage (0-100) */
  progress: number;

  /** Error if polling failed (null if no error) */
  error: Error | null;

  /**
   * Start polling for a specific task.
   * @param taskId - The task ID to poll
   */
  startPolling: (taskId: string) => void;

  /** Stop polling without resetting state */
  stopPolling: () => void;

  /** Reset all state to initial values */
  reset: () => void;

  /**
   * Manually refresh task status once (doesn't start polling).
   * @returns The fetched task or null on error
   */
  refresh: () => Promise<StandardTask | null>;
}

/**
 * Shared polling hook for tracking 3D generation task status.
 *
 * @remarks
 * This hook provides the core polling functionality used by:
 * - {@link useGenerate3D} - For new generation tasks
 * - {@link useTaskStatus} - For tracking existing tasks
 * - {@link usePostProcess} - For post-processing tasks
 *
 * **Features:**
 * - Automatic polling with configurable interval
 * - Timeout handling
 * - Exponential backoff on network errors
 * - Maximum retry limit for consecutive failures
 * - AbortController support for cleanup
 * - Automatic cleanup on component unmount
 *
 * @param options - Polling configuration
 * @returns Polling state and control functions
 *
 * @example
 * ```tsx
 * import { usePolling } from 'magi-3d/react';
 *
 * function TaskMonitor({ taskId }: { taskId: string }) {
 *   const { task, progress, isPolling, startPolling, error } = usePolling({
 *     api: '/api/3d',
 *     onSuccess: (task) => console.log('Complete!', task.result?.modelGlb),
 *     onError: (err) => console.error('Failed:', err.message)
 *   });
 *
 *   useEffect(() => {
 *     if (taskId) startPolling(taskId);
 *   }, [taskId, startPolling]);
 *
 *   if (error) return <div>Error: {error.message}</div>;
 *
 *   return (
 *     <div>
 *       <progress value={progress} max={100} />
 *       <span>{progress}%</span>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePolling(options: UsePollingOptions): UsePollingReturn {
  const {
    api,
    pollingInterval = 3000,
    timeout = 300000,
    maxRetries = 5,
    headers = {},
    onProgress,
    onSuccess,
    onError
  } = options;

  const [task, setTask] = useState<StandardTask | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Refs for tracking state across async operations
  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startTimeRef = useRef<number>(0);
  const consecutiveErrorsRef = useRef<number>(0);
  const currentIntervalRef = useRef<number>(pollingInterval);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearTimeout(pollingRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    setTask(null);
    setTaskId(null);
    setError(null);
    consecutiveErrorsRef.current = 0;
    currentIntervalRef.current = pollingInterval;
  }, [stopPolling, pollingInterval]);

  const fetchTaskStatus = useCallback(async (id: string, signal?: AbortSignal): Promise<StandardTask> => {
    const response = await fetch(`${api}/task/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal
    });

    if (!response.ok) {
      throw new Error(`Failed to get task status: ${response.statusText}`);
    }

    return response.json();
  }, [api, headers]);

  const pollTask = useCallback(async (id: string) => {
    // Check timeout
    if (Date.now() - startTimeRef.current > timeout) {
      const timeoutError = new Error(`Task ${id} timed out after ${timeout}ms`);
      setError(timeoutError);
      setIsPolling(false);
      onError?.(timeoutError);
      return;
    }

    try {
      abortControllerRef.current = new AbortController();
      const taskData = await fetchTaskStatus(id, abortControllerRef.current.signal);

      // Reset error tracking on success
      consecutiveErrorsRef.current = 0;
      currentIntervalRef.current = pollingInterval;

      setTask(taskData);
      setError(null);
      onProgress?.(taskData);

      // Check if task reached terminal state
      if (TERMINAL_STATUSES.includes(taskData.status)) {
        setIsPolling(false);

        if (taskData.status === TaskStatus.SUCCEEDED) {
          onSuccess?.(taskData);
        } else {
          const failError = new Error(
            taskData.error?.message ||
            (taskData.status === TaskStatus.CANCELED ? 'Task was cancelled' : 'Task failed')
          );
          setError(failError);
          onError?.(failError);
        }
        return;
      }

      // Continue polling
      pollingRef.current = setTimeout(() => pollTask(id), currentIntervalRef.current);
    } catch (err) {
      // Ignore abort errors (from cleanup or stop)
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      consecutiveErrorsRef.current++;

      // Check if max retries exceeded
      if (consecutiveErrorsRef.current >= maxRetries) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        const maxRetryError = new Error(
          `Polling failed after ${maxRetries} consecutive errors: ${errorMessage}`
        );
        setError(maxRetryError);
        setIsPolling(false);
        onError?.(maxRetryError);
        return;
      }

      // Exponential backoff with cap
      currentIntervalRef.current = Math.min(currentIntervalRef.current * 1.5, 15000);
      pollingRef.current = setTimeout(() => pollTask(id), currentIntervalRef.current);
    }
  }, [fetchTaskStatus, pollingInterval, timeout, maxRetries, onProgress, onSuccess, onError]);

  const startPolling = useCallback((id: string) => {
    stopPolling();
    setTaskId(id);
    setTask(null);
    setError(null);
    setIsPolling(true);
    startTimeRef.current = Date.now();
    consecutiveErrorsRef.current = 0;
    currentIntervalRef.current = pollingInterval;
    pollTask(id);
  }, [stopPolling, pollingInterval, pollTask]);

  const refresh = useCallback(async (): Promise<StandardTask | null> => {
    if (!taskId) return null;

    try {
      const taskData = await fetchTaskStatus(taskId);
      setTask(taskData);
      setError(null);
      return taskData;
    } catch (err) {
      const refreshError = err instanceof Error ? err : new Error('Failed to refresh');
      setError(refreshError);
      return null;
    }
  }, [taskId, fetchTaskStatus]);

  return {
    task,
    taskId,
    isPolling,
    progress: task?.progress ?? 0,
    error,
    startPolling,
    stopPolling,
    reset,
    refresh
  };
}

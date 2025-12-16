/**
 * @module react/useCreateTask
 * @description React hook for creating 3D tasks (generation and post-processing)
 */

import { useState, useCallback, useRef } from 'react';
import { usePolling, UsePollingOptions } from './usePolling';
import type { TaskParams, StandardTask } from '../types';

export interface UseCreateTaskOptions extends Omit<UsePollingOptions, 'api'> {
  /**
   * API endpoint for 3D tasks
   * @default '/api/3d'
   */
  api?: string;
}

export interface UseCreateTaskReturn {
  /** Submit a new task (generation or post-processing) */
  createTask: (params: TaskParams) => Promise<string>;
  /** Current task state (null if no task) */
  task: StandardTask | null;
  /** Current task ID */
  taskId: string | null;
  /** Whether a task is currently in progress */
  isLoading: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Error if task failed */
  error: Error | null;
  /** Reset state to initial */
  reset: () => void;
  /** Stop polling (does not cancel the task on server) */
  stop: () => void;
}

/**
 * React hook for creating 3D tasks (generation and post-processing).
 *
 * This is the unified hook for all task types:
 * - Text-to-3D generation
 * - Image-to-3D generation
 * - Post-processing (rigging, texturing, conversion, etc.)
 *
 * @example
 * ```tsx
 * import { useCreateTask, TaskType } from 'magi-3d/react';
 *
 * function MyComponent() {
 *   const { createTask, task, isLoading, progress } = useCreateTask({
 *     api: '/api/3d',
 *     onSuccess: (task) => console.log('Done!', task.result?.modelGlb)
 *   });
 *
 *   // Text-to-3D generation
 *   const handleGenerate = () => createTask({
 *     type: TaskType.TEXT_TO_3D,
 *     prompt: 'a cute cat'
 *   });
 *
 *   // Image-to-3D generation
 *   const handleImageTo3D = () => createTask({
 *     type: TaskType.IMAGE_TO_3D,
 *     input: 'https://example.com/cat.jpg'
 *   });
 *
 *   // Post-processing (rigging)
 *   const handleRig = () => createTask({
 *     type: TaskType.RIG,
 *     taskId: 'original-task-id',
 *     skeleton: 'humanoid'
 *   });
 *
 *   return (
 *     <button onClick={handleGenerate}>
 *       Generate {isLoading ? `(${progress}%)` : ''}
 *     </button>
 *   );
 * }
 * ```
 */
export function useCreateTask(options: UseCreateTaskOptions = {}): UseCreateTaskReturn {
  const {
    api = '/api/3d',
    headers = {},
    onError,
    ...pollingOptions
  } = options;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const polling = usePolling({
    api,
    headers,
    onError,
    ...pollingOptions
  });

  const createTask = useCallback(async (params: TaskParams): Promise<string> => {
    // Reset state
    polling.reset();
    setIsSubmitting(true);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      // Submit task (unified endpoint)
      const response = await fetch(`${api}/task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(params),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const id = data.taskId;

      if (!id) {
        throw new Error('No taskId returned from server');
      }

      // Start polling for status
      polling.startPolling(id);
      setIsSubmitting(false);

      return id;
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        setIsSubmitting(false);
        throw err;
      }

      const error = err instanceof Error ? err : new Error('Task creation failed');
      setIsSubmitting(false);
      onError?.(error);
      throw error;
    }
  }, [api, headers, polling, onError]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSubmitting(false);
    polling.reset();
  }, [polling]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSubmitting(false);
    polling.stopPolling();
  }, [polling]);

  return {
    createTask,
    task: polling.task,
    taskId: polling.taskId,
    isLoading: isSubmitting || polling.isPolling,
    progress: polling.progress,
    error: polling.error,
    reset,
    stop
  };
}

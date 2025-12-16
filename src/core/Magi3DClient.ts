/**
 * @module core/Magi3DClient
 * @description High-level client for 3D generation with polling support
 */

import { AbstractProvider } from './AbstractProvider';
import { TaskParams, StandardTask, TaskStatus } from '../types';
import { EventEmitter } from 'eventemitter3';

/**
 * Configuration options for polling task status.
 *
 * @example
 * ```typescript
 * const result = await client.pollUntilDone(taskId, {
 *   interval: 2000,      // Poll every 2 seconds
 *   timeout: 600000,     // 10 minute timeout
 *   maxRetries: 10,      // Allow 10 consecutive failures
 *   onProgress: (task) => console.log(`Progress: ${task.progress}%`)
 * });
 * ```
 */
export interface PollOptions {
  /**
   * Time between status checks in milliseconds.
   * @defaultValue 3000
   */
  interval?: number;

  /**
   * Maximum total wait time in milliseconds before timing out.
   * @defaultValue 300000 (5 minutes)
   */
  timeout?: number;

  /**
   * Maximum number of consecutive network errors before giving up.
   * Resets to 0 after each successful status fetch.
   * @defaultValue 5
   */
  maxRetries?: number;

  /**
   * Callback invoked on each successful status fetch.
   * Useful for updating UI with progress information.
   *
   * @param task - Current task status
   */
  onProgress?: (task: StandardTask) => void;
}

/**
 * Events emitted by {@link Magi3DClient}.
 *
 * @example
 * ```typescript
 * client.on('progress', (task) => {
 *   console.log(`Task ${task.id}: ${task.progress}%`);
 * });
 * ```
 */
export interface Magi3DClientEvents {
  /**
   * Emitted on each polling cycle with the current task status.
   */
  progress: (task: StandardTask) => void;
}

/**
 * High-level client for interacting with 3D generation providers.
 *
 * @remarks
 * `Magi3DClient` provides a unified interface for:
 * - Creating all types of tasks (generation and post-processing)
 * - Polling task status with automatic retries and exponential backoff
 * - Event-driven progress updates via EventEmitter
 *
 * **Unified API:**
 * All operations use a single `createTask()` method. The `type` field
 * in the params determines what operation is performed.
 *
 * **Usage Pattern:**
 * 1. Create a provider instance with your API credentials
 * 2. Create a client with the provider
 * 3. Submit tasks and poll for completion
 *
 * @example
 * ```typescript
 * import { Magi3DClient, TripoProvider, TaskType } from 'magi-3d/server';
 *
 * // Initialize
 * const provider = new TripoProvider({ apiKey: process.env.TRIPO_API_KEY });
 * const client = new Magi3DClient(provider);
 *
 * // Generate a 3D model
 * const taskId = await client.createTask({
 *   type: TaskType.TEXT_TO_3D,
 *   prompt: 'a cute cat sitting on a cushion'
 * });
 *
 * // Wait for completion with progress updates
 * const result = await client.pollUntilDone(taskId, {
 *   onProgress: (task) => console.log(`Progress: ${task.progress}%`)
 * });
 *
 * console.log('Model URL:', result.result?.modelGlb);
 * ```
 *
 * @example
 * ```typescript
 * // Post-processing: Add rigging
 * const rigTaskId = await client.createTask({
 *   type: TaskType.RIG,
 *   taskId: originalTaskId,
 *   skeleton: 'humanoid'
 * });
 *
 * // Post-processing: Convert format
 * const convertTaskId = await client.createTask({
 *   type: TaskType.CONVERT,
 *   taskId: originalTaskId,
 *   format: 'fbx'
 * });
 * ```
 *
 * @see {@link AbstractProvider} for provider implementation details
 * @see {@link TripoProvider} for the Tripo AI provider
 */
export class Magi3DClient extends EventEmitter {
  /**
   * Creates a new Magi3DClient instance.
   *
   * @param provider - The provider instance to use for API calls
   *
   * @example
   * ```typescript
   * const client = new Magi3DClient(new TripoProvider({ apiKey: 'xxx' }));
   * ```
   */
  constructor(private provider: AbstractProvider) {
    super();
  }

  /**
   * Creates a new task (generation or post-processing).
   *
   * @remarks
   * This is the unified entry point for all operations. The `type` field
   * in params determines what operation is performed.
   *
   * @param params - Task parameters (type determines the operation)
   * @returns Promise resolving to the task ID
   *
   * @throws Error if the provider API returns an error
   *
   * @example
   * ```typescript
   * // Text-to-3D
   * const taskId = await client.createTask({
   *   type: TaskType.TEXT_TO_3D,
   *   prompt: 'a medieval sword with golden handle'
   * });
   *
   * // Image-to-3D with provider options
   * const taskId = await client.createTask({
   *   type: TaskType.IMAGE_TO_3D,
   *   input: 'https://example.com/character.jpg',
   *   providerOptions: {
   *     texture_quality: 'detailed',
   *     pbr: true
   *   }
   * });
   *
   * // Add rigging to existing model
   * const rigTaskId = await client.createTask({
   *   type: TaskType.RIG,
   *   taskId: originalTaskId,
   *   skeleton: 'humanoid'
   * });
   *
   * // Convert format
   * const convertTaskId = await client.createTask({
   *   type: TaskType.CONVERT,
   *   taskId: originalTaskId,
   *   format: 'fbx'
   * });
   * ```
   */
  async createTask(params: TaskParams): Promise<string> {
    return this.provider.createTask(params);
  }

  /**
   * Fetches the current status of a task.
   *
   * @param taskId - The task ID to query
   * @returns Promise resolving to the current task status
   *
   * @example
   * ```typescript
   * const task = await client.getTask(taskId);
   * if (task.status === TaskStatus.SUCCEEDED) {
   *   console.log('Model ready:', task.result?.modelGlb);
   * }
   * ```
   */
  async getTask(taskId: string): Promise<StandardTask> {
    return this.provider.getTaskStatus(taskId);
  }

  /**
   * Polls task status until completion, failure, or timeout.
   *
   * @remarks
   * **Behavior:**
   * - Polls at regular intervals until task reaches a terminal state
   * - Emits 'progress' events on each successful poll
   * - Implements exponential backoff on network errors
   * - Respects maximum retry limit for consecutive failures
   *
   * **Terminal States:**
   * - `SUCCEEDED` - Resolves with the completed task
   * - `FAILED` - Rejects with error containing failure details
   * - `CANCELED` - Rejects with cancellation error
   * - `TIMEOUT` - Rejects when timeout is exceeded
   *
   * @param taskId - The task ID to poll
   * @param options - Polling configuration options
   * @returns Promise resolving to the completed task
   *
   * @throws Error if task fails with error details
   * @throws Error if task is cancelled
   * @throws Error if timeout is exceeded
   * @throws Error if max retries exceeded due to network errors
   *
   * @example
   * ```typescript
   * try {
   *   const result = await client.pollUntilDone(taskId, {
   *     interval: 2000,
   *     timeout: 300000,
   *     onProgress: (task) => {
   *       console.log(`${task.progress}% - ${task.progressDetail || 'Processing...'}`);
   *     }
   *   });
   *   console.log('Success! Model:', result.result?.modelGlb);
   * } catch (error) {
   *   console.error('Generation failed:', error.message);
   * }
   * ```
   */
  async pollUntilDone(taskId: string, options: PollOptions = {}): Promise<StandardTask> {
    const {
      interval = 3000,
      timeout = 300000,
      maxRetries = 5,
      onProgress
    } = options;

    const startTime = Date.now();
    let consecutiveErrors = 0;
    let currentInterval = interval;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        // Check timeout
        if (Date.now() - startTime > timeout) {
          return reject(new Error(`Task ${taskId} timed out after ${timeout}ms`));
        }

        try {
          const task = await this.getTask(taskId);

          // Reset error counter on success
          consecutiveErrors = 0;
          currentInterval = interval;

          // Emit progress event
          this.emit('progress', task);

          // Call progress callback if provided
          onProgress?.(task);

          // Check if task is complete
          if (task.status === TaskStatus.SUCCEEDED) {
            return resolve(task);
          }

          if (task.status === TaskStatus.FAILED) {
            const errorMsg = task.error?.message || 'Task failed';
            return reject(new Error(`${errorMsg} (code: ${task.error?.code || 'UNKNOWN'})`));
          }

          if (task.status === TaskStatus.CANCELED) {
            return reject(new Error('Task was cancelled'));
          }

          // Continue polling
          setTimeout(poll, currentInterval);
        } catch (error) {
          consecutiveErrors++;

          // Check if max retries exceeded
          if (consecutiveErrors >= maxRetries) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return reject(new Error(
              `Polling failed after ${maxRetries} consecutive errors: ${errorMessage}`
            ));
          }

          // Exponential backoff with cap
          currentInterval = Math.min(currentInterval * 1.5, 15000);
          setTimeout(poll, currentInterval);
        }
      };

      poll();
    });
  }
}

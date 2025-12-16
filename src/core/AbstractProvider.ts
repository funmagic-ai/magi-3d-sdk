/**
 * @module core/AbstractProvider
 * @description Base provider abstraction for 3D generation services
 */

import {
  TaskParams,
  StandardTask,
  TaskType,
  ProviderConfig,
  isPrimaryGenerationTask,
  isImageTo3DParams
} from '../types';

/**
 * Supported image input formats for 3D generation.
 *
 * @remarks
 * The SDK accepts two input formats for image-to-3D generation:
 * - **URL** - A publicly accessible HTTP/HTTPS URL pointing to an image
 * - **Base64** - Base64-encoded image data (with or without data URI prefix)
 *
 * For file uploads, upload to cloud storage (e.g., S3, Tencent COS) first
 * and provide the resulting URL.
 *
 * @example
 * ```typescript
 * // URL input (recommended)
 * const input: ImageInput = 'https://example.com/image.jpg';
 *
 * // Base64 input (with data URI prefix)
 * const input: ImageInput = 'data:image/png;base64,iVBORw0KGgo...';
 *
 * // Base64 input (raw)
 * const input: ImageInput = 'iVBORw0KGgoAAAANSUhEUgAA...';
 * ```
 */
export type ImageInput = string;

/**
 * Abstract base class for all 3D generation providers.
 *
 * @remarks
 * This class implements the **Template Method Pattern** to provide a consistent
 * interface across different 3D generation services (Tripo, Hunyuan, Meshy, etc.).
 *
 * **Unified API:**
 * All operations (generation and post-processing) use a single `createTask()` method.
 * The `type` field in {@link TaskParams} determines what operation is performed.
 *
 * **Architecture:**
 * - Public method (`createTask`) handles input validation and orchestration
 * - Protected abstract method (`doCreateTask`) contains provider-specific logic
 * - Each provider normalizes responses to {@link StandardTask} format
 *
 * **Implementing a Custom Provider:**
 * ```typescript
 * class MyProvider extends AbstractProvider<MyConfig> {
 *   readonly name = 'MyProvider';
 *
 *   protected async prepareInput(input: ImageInput): Promise<string> {
 *     // Upload or validate input, return URL/token
 *   }
 *
 *   protected async doCreateTask(params: TaskParams): Promise<string> {
 *     // Call your API based on params.type, return task ID
 *   }
 *
 *   async getTaskStatus(taskId: string): Promise<StandardTask> {
 *     // Fetch and normalize task status
 *   }
 * }
 * ```
 *
 * @typeParam TConfig - Provider-specific configuration type extending {@link ProviderConfig}
 *
 * @see {@link TripoProvider} for a complete implementation example
 * @see {@link Magi3DClient} for the client that consumes providers
 */
export abstract class AbstractProvider<TConfig extends ProviderConfig = ProviderConfig> {
  /**
   * Human-readable name of the provider (e.g., 'Tripo', 'Hunyuan').
   * Used for logging and error messages.
   */
  abstract readonly name: string;

  /**
   * Set of task types supported by this provider.
   * Populated in the constructor of concrete implementations.
   */
  protected supportedTaskTypes: Set<TaskType> = new Set();

  /**
   * Creates a new provider instance.
   *
   * @param config - Provider-specific configuration (API keys, endpoints, etc.)
   */
  constructor(protected config: TConfig) {}

  /**
   * Checks if this provider supports a specific task type.
   *
   * @param taskType - The task type to check
   * @returns `true` if the task type is supported, `false` otherwise
   *
   * @example
   * ```typescript
   * if (provider.supports(TaskType.RIG)) {
   *   await provider.createTask({ type: TaskType.RIG, taskId: '...' });
   * }
   * ```
   */
  supports(taskType: TaskType): boolean {
    return this.supportedTaskTypes.has(taskType);
  }

  /**
   * Creates a new task (generation or post-processing).
   *
   * @remarks
   * This is the unified entry point for all operations. The `type` field
   * in params determines what operation is performed:
   *
   * **Primary Generation:**
   * - `TEXT_TO_3D` - Generate from text prompt
   * - `IMAGE_TO_3D` - Generate from image
   * - `MULTIVIEW_TO_3D` - Generate from multiple images
   *
   * **Post-Processing:**
   * - `TEXTURE` - Re-texture model
   * - `REFINE` - Improve quality
   * - `RIG` - Add skeleton
   * - `ANIMATE` - Apply animation
   * - `SEGMENT` - Segment into parts
   * - `DECIMATE` - Reduce polygons
   * - `CONVERT` - Format conversion
   *
   * @param params - Task parameters (type determines the operation)
   * @returns Promise resolving to the task ID for status tracking
   *
   * @throws Error if the task type is not supported
   * @throws Error if input preparation fails
   * @throws Error if the provider API returns an error
   *
   * @example
   * ```typescript
   * // Text-to-3D
   * const taskId = await provider.createTask({
   *   type: TaskType.TEXT_TO_3D,
   *   prompt: 'a cute cat sitting'
   * });
   *
   * // Image-to-3D
   * const taskId = await provider.createTask({
   *   type: TaskType.IMAGE_TO_3D,
   *   input: 'https://example.com/cat.jpg'
   * });
   *
   * // Rigging (post-process)
   * const taskId = await provider.createTask({
   *   type: TaskType.RIG,
   *   taskId: originalTaskId,
   *   skeleton: 'humanoid'
   * });
   *
   * // Format conversion (post-process)
   * const taskId = await provider.createTask({
   *   type: TaskType.CONVERT,
   *   taskId: originalTaskId,
   *   format: 'fbx'
   * });
   * ```
   */
  async createTask(params: TaskParams): Promise<string> {
    // Check if task type is supported
    if (!this.supports(params.type)) {
      throw new Error(`Provider ${this.name} does not support task type: ${params.type}`);
    }

    // For image-based generation, prepare the input
    if (isPrimaryGenerationTask(params) && isImageTo3DParams(params)) {
      const readyInput = await this.prepareInput(params.input);
      // Create a copy with the prepared input
      const preparedParams = { ...params, input: readyInput };
      return this.doCreateTask(preparedParams);
    }

    return this.doCreateTask(params);
  }

  // =========================================================
  // Abstract Methods - Must be implemented by subclasses
  // =========================================================

  /**
   * Prepares and validates user input for the provider's API.
   *
   * @remarks
   * Validates and transforms the input (URL or base64) for the provider's API.
   * Different providers may have different requirements:
   * - Some accept URLs directly
   * - Some prefer base64-encoded data
   * - Some may require specific URL formats or hosts
   *
   * @param input - User input (URL or base64 string)
   * @returns Promise resolving to a string ready for the API
   *
   * @throws Error if the input format is not supported
   */
  protected abstract prepareInput(input: ImageInput): Promise<string>;

  /**
   * Implements the provider-specific task creation logic.
   *
   * @remarks
   * This method should handle all task types supported by the provider.
   * Use the `params.type` field to determine the operation and build
   * the appropriate API payload.
   *
   * @param params - Task parameters (already validated and prepared)
   * @returns Promise resolving to the task ID
   */
  protected abstract doCreateTask(params: TaskParams): Promise<string>;

  /**
   * Fetches the current status of a task.
   *
   * @remarks
   * Implementations must normalize the provider's response to {@link StandardTask} format,
   * mapping provider-specific statuses to {@link TaskStatus} enum values.
   *
   * @param taskId - The task ID to query
   * @returns Promise resolving to normalized task status
   *
   * @throws Error if the task is not found or API call fails
   */
  abstract getTaskStatus(taskId: string): Promise<StandardTask>;
}

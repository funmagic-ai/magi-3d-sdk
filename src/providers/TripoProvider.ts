/**
 * @module providers/TripoProvider
 * @description Tripo AI provider implementation for 3D model generation
 */

import axios, { AxiosInstance } from 'axios';
import { AbstractProvider, ImageInput } from '../core/AbstractProvider';
import { ApiError } from '../core/Magi3DClient';
import { InputUtils } from '../utils/InputUtils';
import {
  TaskParams,
  StandardTask,
  TaskStatus,
  TaskType,
  ProviderId,
  TripoConfig,
  TripoOptions,
  TaskArtifacts,
  isTextTo3DParams,
  isImageTo3DParams,
  isMultiviewTo3DParams,
  isTextureParams,
  isRigParams,
  isAnimateParams,
  isSegmentParams,
  isDecimateParams,
  isConvertParams,
  isImportParams
} from '../types';

// ============================================
// Tripo API Types (Internal)
// ============================================

/**
 * Tripo API response wrapper
 * @internal
 */
interface TripoApiResponse<T = unknown> {
  code: number;
  message?: string;
  data: T;
}

/**
 * Tripo API task data structure
 * @internal
 */
interface TripoTaskData {
  task_id: string;
  status: string;
  type: string;
  progress?: number;
  create_time?: number;
  // Error code present when status is failed/banned/expired/cancelled/unknown
  error_code?: number;
  output?: {
    // Success fields
    model?: string;
    pbr_model?: string;
    base_model?: string;
    rendered_image?: string;
    generated_video?: string;
  };
}

/**
 * Tripo error code ranges:
 * - 1000-1999: Request errors (HTTP 400-499, except 1000/1001 which are HTTP 500)
 * - 2000-2999: Task generation errors (HTTP 400-499)
 * @internal
 */
const TRIPO_ERROR_CODE_MAP: Record<number, string> = {
  // 1xxx - Request/Server errors
  1000: 'SERVER_ERROR',
  1001: 'FATAL_SERVER_ERROR',
  // 2xxx - Task generation errors
  2000: 'RATE_LIMIT_EXCEEDED',
  2001: 'TASK_NOT_FOUND',
  2002: 'UNSUPPORTED_TASK_TYPE',
  2003: 'INPUT_FILE_EMPTY',
  2004: 'UNSUPPORTED_FILE_TYPE',
  2006: 'INVALID_ORIGINAL_TASK',
  2007: 'ORIGINAL_TASK_NOT_SUCCESS',
  2008: 'CONTENT_POLICY_VIOLATION',
  2010: 'INSUFFICIENT_CREDITS',
  2015: 'DEPRECATED_VERSION',
  2018: 'MODEL_TOO_COMPLEX'
};

// ============================================
// Provider Implementation
// ============================================

/**
 * Tripo AI provider for 3D model generation.
 *
 * @remarks
 * Tripo AI is a leading 3D generation platform offering:
 * - **Text-to-3D**: Generate models from text descriptions
 * - **Image-to-3D**: Convert images to 3D models
 * - **Multi-view to 3D**: Generate from multiple view images
 * - **Post-processing**: Rigging, texturing, format conversion, and more
 *
 * **Supported Task Types:**
 * - {@link TaskType.TEXT_TO_3D} - Text to 3D model
 * - {@link TaskType.IMAGE_TO_3D} - Image to 3D model
 * - {@link TaskType.MULTIVIEW_TO_3D} - Multi-view images to 3D
 * - {@link TaskType.TEXTURE} - Re-texture model
 * - {@link TaskType.REFINE} - Improve model quality
 * - {@link TaskType.RIG} - Add skeletal rigging
 * - {@link TaskType.ANIMATE} - Apply animation
 * - {@link TaskType.SEGMENT} - Segment mesh into parts
 * - {@link TaskType.DECIMATE} - Reduce polygon count
 * - {@link TaskType.CONVERT} - Format conversion
 * - {@link TaskType.IMPORT} - Import external model
 *
 * **API Documentation:**
 * @see https://platform.tripo3d.ai/docs
 *
 * @example
 * ```typescript
 * import { TripoProvider, Magi3DClient, TaskType } from 'magi-3d/server';
 *
 * // Initialize provider
 * const provider = new TripoProvider({
 *   apiKey: process.env.TRIPO_API_KEY!
 * });
 *
 * // Create client
 * const client = new Magi3DClient(provider);
 *
 * // Text-to-3D generation
 * const taskId = await client.createTask({
 *   type: TaskType.TEXT_TO_3D,
 *   prompt: 'a cute cat wearing a wizard hat',
 *   providerOptions: {
 *     model_version: 'v2.5-20250123',
 *     pbr: true,
 *     texture_quality: 'detailed'
 *   }
 * });
 *
 * // Wait for completion
 * const result = await client.pollUntilDone(taskId);
 * console.log('Model:', result.result?.modelGlb);
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
 * // Post-processing: Convert to FBX
 * const convertTaskId = await client.createTask({
 *   type: TaskType.CONVERT,
 *   taskId: originalTaskId,
 *   format: 'fbx'
 * });
 * ```
 */
export class TripoProvider extends AbstractProvider<TripoConfig> {
  /** Provider name identifier */
  readonly name = 'Tripo';

  /** Axios HTTP client instance */
  private client: AxiosInstance;

  /**
   * Creates a new TripoProvider instance.
   *
   * @param config - Tripo API configuration
   *
   * @example
   * ```typescript
   * const provider = new TripoProvider({
   *   apiKey: 'your-api-key',
   *   baseUrl: 'https://api.tripo3d.ai',  // Optional
   *   timeout: 120000                      // Optional, 2 min default
   * });
   * ```
   */
  constructor(config: TripoConfig) {
    super(config);

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.tripo3d.ai',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: config.timeout || 120000
    });

    // Register all supported task types
    this.supportedTaskTypes.add(TaskType.TEXT_TO_3D);
    this.supportedTaskTypes.add(TaskType.IMAGE_TO_3D);
    this.supportedTaskTypes.add(TaskType.MULTIVIEW_TO_3D);
    this.supportedTaskTypes.add(TaskType.TEXTURE);
    this.supportedTaskTypes.add(TaskType.REFINE);
    this.supportedTaskTypes.add(TaskType.RIG);
    this.supportedTaskTypes.add(TaskType.ANIMATE);
    this.supportedTaskTypes.add(TaskType.SEGMENT);
    this.supportedTaskTypes.add(TaskType.DECIMATE);
    this.supportedTaskTypes.add(TaskType.CONVERT);
    this.supportedTaskTypes.add(TaskType.IMPORT);
  }

  /**
   * Prepares input for the Tripo API.
   *
   * @remarks
   * Tripo currently only accepts URL inputs directly. For base64 data,
   * use the Tripo upload API first to get a file_token, then use the URL.
   *
   * @param input - Image input (must be a URL)
   * @returns The validated URL
   *
   * @throws Error if input is not a URL
   */
  protected async prepareInput(input: ImageInput): Promise<string> {
    if (InputUtils.isUrl(input)) {
      return input;
    }

    throw new Error(
      'TripoProvider requires URL inputs. For base64 data, upload the image first ' +
      'using the Tripo upload API, then provide the resulting URL.'
    );
  }

  /**
   * Creates a task via the Tripo API.
   *
   * @param params - Task parameters
   * @returns Task ID from Tripo
   *
   * @throws Error if API request fails (HTTP 4xx/5xx or code !== 0)
   */
  protected async doCreateTask(params: TaskParams<TripoOptions>): Promise<string> {
    const payload = this.buildPayload(params);

    try {
      const response = await this.client.post<TripoApiResponse<{ task_id: string }>>(
        '/v2/openapi/task',
        payload
      );

      if (response.data.code !== 0) {
        throw this.createTripoError(response.data.code, response.data.message, response.data);
      }

      return response.data.data.task_id;
    } catch (error) {
      // Handle axios HTTP errors (4xx/5xx)
      if (axios.isAxiosError(error) && error.response?.data) {
        const tripoCode = error.response.data.code;
        const tripoMessage = error.response.data.message;
        throw this.createTripoError(tripoCode, tripoMessage, error.response.data, error.response.status);
      }
      throw error;
    }
  }

  /**
   * Creates a standardized error from Tripo error response.
   *
   * @param tripoCode - Tripo error code (1xxx or 2xxx)
   * @param message - Error message from Tripo
   * @param raw - Raw response data for debugging
   * @param httpStatus - HTTP status code (optional)
   * @returns ApiError with formatted message and raw response
   *
   * @internal
   */
  private createTripoError(tripoCode: number, message?: string, raw?: unknown, httpStatus?: number): ApiError {
    const sdkCode = TRIPO_ERROR_CODE_MAP[tripoCode] || `TRIPO_ERROR_${tripoCode}`;
    const errorType = tripoCode >= 2000 ? 'Task error' : 'Request error';
    const httpInfo = httpStatus ? ` [HTTP ${httpStatus}]` : '';
    return new ApiError(
      `${errorType}${httpInfo}: ${message || 'Unknown error'}`,
      sdkCode,
      raw,
      httpStatus
    );
  }

  /**
   * Builds the Tripo API payload based on task type.
   *
   * @param params - Task parameters
   * @returns API payload object
   */
  private buildPayload(params: TaskParams<TripoOptions>): Record<string, unknown> {
    const options = params.providerOptions || {};

    // Text-to-3D
    if (isTextTo3DParams(params)) {
      return {
        type: 'text_to_model',
        prompt: params.prompt,
        ...(params.negative_prompt && { negative_prompt: params.negative_prompt }),
        ...options
      };
    }

    // Image-to-3D (Tripo does not support prompt for image_to_model)
    if (isImageTo3DParams(params)) {
      return {
        type: 'image_to_model',
        file: {
          type: 'jpg',
          url: params.input
        },
        ...options
      };
    }

    // Multi-view to 3D (Tripo does not support prompt for multiview_to_model)
    if (isMultiviewTo3DParams(params)) {
      return {
        type: 'multiview_to_model',
        files: params.inputs.map((url) => ({
          type: 'jpg',
          url: url || undefined
        })).filter(f => f.url),
        ...options
      };
    }

    // Texture
    if (isTextureParams(params)) {
      const payload: Record<string, unknown> = {
        type: 'texture_model',
        original_model_task_id: params.taskId
      };
      if (params.prompt) {
        payload.texture_prompt = { text: params.prompt };
      }
      if (params.styleImage) {
        payload.style_image = { url: params.styleImage };
      }
      if (params.enablePBR !== undefined) {
        payload.pbr = params.enablePBR;
      }
      return { ...payload, ...options };
    }

    // Rig
    if (isRigParams(params)) {
      return {
        type: 'animate_rig',
        original_model_task_id: params.taskId,
        ...(params.skeleton && { rig_type: params.skeleton === 'humanoid' ? 'biped' : params.skeleton }),
        ...(params.outFormat && { out_format: params.outFormat }),
        ...options
      };
    }

    // Animate
    if (isAnimateParams(params)) {
      return {
        type: 'animate_retarget',
        original_model_task_id: params.taskId,
        animation: params.animation,
        ...(params.outFormat && { out_format: params.outFormat }),
        ...(params.animateInPlace !== undefined && { animate_in_place: params.animateInPlace }),
        ...options
      };
    }

    // Segment (mesh segmentation)
    if (isSegmentParams(params)) {
      return {
        type: 'mesh_segmentation',
        original_model_task_id: params.taskId,
        ...(params.partNames && { part_names: params.partNames }),
        ...options
      };
    }

    // Decimate (highpoly to lowpoly)
    if (isDecimateParams(params)) {
      return {
        type: 'highpoly_to_lowpoly',
        original_model_task_id: params.taskId,
        ...(params.targetFaceCount && { face_limit: params.targetFaceCount }),
        ...(params.quad !== undefined && { quad: params.quad }),
        ...(params.bake !== undefined && { bake: params.bake }),
        ...options
      };
    }

    // Convert
    if (isConvertParams(params)) {
      return {
        type: 'convert_model',
        original_model_task_id: params.taskId,
        format: params.format.toUpperCase(),
        ...(params.quad !== undefined && { quad: params.quad }),
        ...(params.faceLimit && { face_limit: params.faceLimit }),
        ...(params.textureSize && { texture_size: params.textureSize }),
        ...(params.scaleFactor && { scale_factor: params.scaleFactor }),
        ...options
      };
    }

    // Import
    if (isImportParams(params)) {
      return {
        type: 'import_model',
        file: {
          object: {
            bucket: 'tripo-data',
            key: params.input
          }
        },
        ...options
      };
    }

    // Refine (default case for refine_model)
    return {
      type: 'refine_model',
      original_model_task_id: (params as { taskId: string }).taskId,
      ...options
    };
  }

  /**
   * Fetches and normalizes task status from the Tripo API.
   *
   * @param taskId - The Tripo task ID
   * @returns Normalized StandardTask object
   *
   * @throws Error if HTTP request fails (4xx/5xx)
   */
  async getTaskStatus(taskId: string): Promise<StandardTask> {
    try {
      const response = await this.client.get<TripoApiResponse<TripoTaskData>>(
        `/v2/openapi/task/${taskId}`
      );

      // HTTP 200 + code !== 0: API-level error (shouldn't happen for polling, but handle it)
      if (response.data.code !== 0) {
        return this.normalizeErrorResponse(taskId, response.data.code, response.data.message);
      }

      // HTTP 200 + code === 0: Normal response, check status field
      return this.normalizeTripoResponse(response.data.data);
    } catch (error) {
      // Handle axios HTTP errors (4xx/5xx) - these are request errors, throw them
      if (axios.isAxiosError(error) && error.response?.data) {
        const tripoCode = error.response.data.code;
        const tripoMessage = error.response.data.message;
        throw this.createTripoError(tripoCode, tripoMessage, error.response.data, error.response.status);
      }
      throw error;
    }
  }

  /**
   * Normalizes a Tripo error response (code !== 0) to StandardTask format.
   *
   * @param taskId - The task ID
   * @param tripoCode - Tripo error code (1xxx or 2xxx)
   * @param message - Tripo error message
   * @returns StandardTask with FAILED status
   *
   * @internal
   */
  private normalizeErrorResponse(taskId: string, tripoCode: number, message?: string): StandardTask {
    const sdkErrorCode = TRIPO_ERROR_CODE_MAP[tripoCode] || `TRIPO_ERROR_${tripoCode}`;

    return {
      id: taskId,
      provider: ProviderId.TRIPO,
      type: TaskType.TEXT_TO_3D, // Unknown at this point
      status: TaskStatus.FAILED,
      progress: 0,
      error: {
        code: sdkErrorCode,
        message: message || 'Task failed',
        raw: { tripoCode, message }
      },
      createdAt: Date.now()
    };
  }

  /**
   * Normalizes Tripo API response (code === 0) to SDK StandardTask format.
   *
   * @remarks
   * This method is called when the Tripo API returns code === 0.
   * Task failures (code !== 0) are handled by normalizeErrorResponse.
   *
   * @param data - Raw Tripo task data
   * @returns Normalized StandardTask
   *
   * @internal
   */
  private normalizeTripoResponse(data: TripoTaskData): StandardTask {
    // Map Tripo status strings to SDK TaskStatus enum
    // Note: 'failed', 'banned', 'expired' should come with code !== 0
    // and be handled by normalizeErrorResponse, but kept here as fallback
    const statusMap: Record<string, TaskStatus> = {
      'queued': TaskStatus.PENDING,
      'running': TaskStatus.PROCESSING,
      'success': TaskStatus.SUCCEEDED,
      'failed': TaskStatus.FAILED,
      'banned': TaskStatus.FAILED,
      'expired': TaskStatus.FAILED,
      'cancelled': TaskStatus.CANCELED,
      'unknown': TaskStatus.PROCESSING
    };

    // Map Tripo task types to SDK TaskType enum
    const taskTypeMap: Record<string, TaskType> = {
      'text_to_model': TaskType.TEXT_TO_3D,
      'image_to_model': TaskType.IMAGE_TO_3D,
      'multiview_to_model': TaskType.MULTIVIEW_TO_3D,
      'texture_model': TaskType.TEXTURE,
      'refine_model': TaskType.REFINE,
      'animate_rig': TaskType.RIG,
      'animate_retarget': TaskType.ANIMATE,
      'mesh_segmentation': TaskType.SEGMENT,
      'highpoly_to_lowpoly': TaskType.DECIMATE,
      'convert_model': TaskType.CONVERT,
      'import_model': TaskType.IMPORT
    };

    const sdkStatus = statusMap[data.status] || TaskStatus.PROCESSING;
    const sdkType = taskTypeMap[data.type] || TaskType.IMAGE_TO_3D;

    // Build result artifacts if task succeeded
    // Output priority for modelGlb: pbr_model > model > base_model
    // - pbr_model: Available when pbr=true (best quality with PBR materials)
    // - model: Standard textured model (when pbr=false, texture=true)
    // - base_model: Base geometry without texture (when texture=false)
    let result: TaskArtifacts | undefined;
    if (data.status === 'success' && data.output) {
      const { model, pbr_model, base_model, rendered_image, generated_video } = data.output;

      // Determine the primary GLB model URL
      const modelGlb = pbr_model || model || base_model || '';

      result = {
        modelGlb,
        modelPbr: pbr_model,
        modelBase: base_model,
        thumbnail: rendered_image,
        video: generated_video
      };
    }

    // Build error object if task status indicates failure
    // For HTTP 200 + code 0 + failure status, read error_code from task data
    let error: StandardTask['error'];
    if (sdkStatus === TaskStatus.FAILED || sdkStatus === TaskStatus.CANCELED) {
      // Map error_code if present, otherwise use status-based codes
      let sdkErrorCode: string;
      if (data.error_code !== undefined) {
        sdkErrorCode = TRIPO_ERROR_CODE_MAP[data.error_code] || `TRIPO_ERROR_${data.error_code}`;
      } else {
        // Fallback based on status string
        const statusCodeMap: Record<string, string> = {
          'failed': 'GENERATION_FAILED',
          'banned': 'CONTENT_POLICY_VIOLATION',
          'expired': 'TASK_EXPIRED',
          'cancelled': 'TASK_CANCELED',
          'unknown': 'UNKNOWN_ERROR'
        };
        sdkErrorCode = statusCodeMap[data.status] || 'GENERATION_FAILED';
      }

      // Default messages based on status
      const statusMessageMap: Record<string, string> = {
        'failed': 'Model generation failed',
        'banned': 'Task rejected due to content policy violation',
        'expired': 'Task expired after timeout period',
        'cancelled': 'Task was cancelled',
        'unknown': 'Task status is unknown'
      };

      error = {
        code: sdkErrorCode,
        message: statusMessageMap[data.status] || 'Task failed',
        raw: data
      };
    }

    return {
      id: data.task_id,
      provider: ProviderId.TRIPO,
      type: sdkType,
      status: sdkStatus,
      progress: data.progress || 0,
      progressDetail: sdkStatus === TaskStatus.PROCESSING ? `${data.progress || 0}%` : undefined,
      result,
      error,
      createdAt: data.create_time ? data.create_time * 1000 : Date.now(),
      finishedAt: (sdkStatus === TaskStatus.SUCCEEDED || sdkStatus === TaskStatus.FAILED)
        ? Date.now()
        : undefined
    };
  }
}

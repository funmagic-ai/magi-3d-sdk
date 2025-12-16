/**
 * @module providers/TripoProvider
 * @description Tripo AI provider implementation for 3D model generation
 */

import axios, { AxiosInstance } from 'axios';
import { AbstractProvider, ImageInput } from '../core/AbstractProvider';
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
  output?: {
    model?: string;
    pbr_model?: string;
    base_model?: string;
    rendered_image?: string;
    generated_video?: string;
  };
}

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
   * @throws Error if API request fails
   */
  protected async doCreateTask(params: TaskParams<TripoOptions>): Promise<string> {
    const payload = this.buildPayload(params);

    const response = await this.client.post<TripoApiResponse<{ task_id: string }>>(
      '/v2/openapi/task',
      payload
    );

    if (response.data.code !== 0) {
      throw new Error(
        `Tripo API error (code ${response.data.code}): ${response.data.message || 'Unknown error'}`
      );
    }

    return response.data.data.task_id;
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

    // Image-to-3D
    if (isImageTo3DParams(params)) {
      return {
        type: 'image_to_model',
        file: {
          type: 'jpg',
          url: params.input
        },
        ...(params.prompt && { prompt: params.prompt }),
        ...options
      };
    }

    // Multi-view to 3D
    if (isMultiviewTo3DParams(params)) {
      return {
        type: 'multiview_to_model',
        files: params.inputs.map((url, index) => ({
          type: 'jpg',
          url: url || undefined
        })).filter(f => f.url),
        ...(params.prompt && { prompt: params.prompt }),
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
   * @throws Error if API request fails
   */
  async getTaskStatus(taskId: string): Promise<StandardTask> {
    const response = await this.client.get<TripoApiResponse<TripoTaskData>>(
      `/v2/openapi/task/${taskId}`
    );

    if (response.data.code !== 0) {
      throw new Error(
        `Failed to get task status (code ${response.data.code}): ${response.data.message || 'Unknown error'}`
      );
    }

    return this.normalizeTripoResponse(response.data.data);
  }

  /**
   * Normalizes Tripo API response to SDK StandardTask format.
   *
   * @param data - Raw Tripo task data
   * @returns Normalized StandardTask
   *
   * @internal
   */
  private normalizeTripoResponse(data: TripoTaskData): StandardTask {
    // Map Tripo status strings to SDK TaskStatus enum
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
    let result: TaskArtifacts | undefined;
    if (data.status === 'success' && data.output) {
      result = {
        modelGlb: data.output.model || data.output.pbr_model || '',
        thumbnail: data.output.rendered_image,
        modelObj: data.output.base_model?.endsWith('.obj') ? data.output.base_model : undefined,
        video: data.output.generated_video
      };
    }

    // Build error object if task failed
    let error: StandardTask['error'];
    if (sdkStatus === TaskStatus.FAILED) {
      error = {
        code: data.status === 'banned' ? 'CONTENT_POLICY_VIOLATION' : 'GENERATION_FAILED',
        message: data.status === 'banned'
          ? 'Task rejected due to content policy violation'
          : 'Model generation failed',
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

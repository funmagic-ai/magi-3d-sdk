/**
 * @module providers/TripoProvider
 * @description Tripo AI provider implementation for 3D model generation
 */

import axios, { AxiosInstance } from 'axios';
import { AbstractProvider, ImageInput } from '../core/AbstractProvider';
import { ApiError } from '../core/Magi3DClient';
import { InputUtils } from '../utils/InputUtils';
import { uploadToS3 } from '../utils/s3-upload';
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
  isTextToImageParams,
  isGenerateImageParams,
  isTextureParams,
  isRefineParams,
  isRigParams,
  isAnimateParams,
  isSegmentParams,
  isMeshCompletionParams,
  isDecimateParams,
  isConvertParams,
  isImportParams,
  isPreRigCheckParams,
  isStylizeParams
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
    // Model output fields
    model?: string;
    pbr_model?: string;
    base_model?: string;
    rendered_image?: string;
    generated_video?: string;
    // Image generation output
    generated_image?: string;
    // Pre-rig check output
    riggable?: boolean;
    rig_type?: string;
  };
}

/**
 * Tripo STS token response
 * @internal
 */
interface TripoStsTokenData {
  s3_host: string;
  resource_bucket: string;
  resource_uri: string;
  session_token: string;
  sts_ak: string;
  sts_sk: string;
}

/**
 * Resolved file reference for Tripo API payloads.
 * Exactly one of file_token, url, or object should be present.
 * @internal
 */
interface TripoFileRef {
  type: string;
  file_token?: string;
  url?: string;
  object?: { bucket: string; key: string };
}

/** Image extensions accepted by Tripo Direct Upload */
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);

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
  1004: 'INVALID_PARAMETER',
  1005: 'ACCESS_DENIED',
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
  2014: 'AUDIT_SERVICE_ERROR',
  2015: 'DEPRECATED_VERSION',
  2016: 'DEPRECATED_TASK_TYPE',
  2017: 'INVALID_MODEL_VERSION',
  2018: 'MODEL_TOO_COMPLEX',
  2019: 'FILE_NOT_FOUND'
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

  /** Whether STS upload is enabled for file inputs */
  private stsUploadEnabled: boolean;

  /**
   * Creates a new TripoProvider instance.
   *
   * @param config - Tripo API configuration. If apiKey is not provided,
   *                 it will be read from TRIPO_API_KEY environment variable.
   *
   * @example
   * ```typescript
   * // Using environment variable (process.env.TRIPO_API_KEY)
   * const provider = new TripoProvider();
   *
   * // Or with explicit API key
   * const provider = new TripoProvider({
   *   apiKey: 'your-api-key',
   *   baseUrl: 'https://api.tripo3d.ai',  // Optional
   *   timeout: 120000                      // Optional, 2 min default
   * });
   * ```
   */
  constructor(config: TripoConfig = {}) {
    // Resolve API key from config or environment variable
    const apiKey = config.apiKey || process.env.TRIPO_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Tripo API key is required. Provide it via config.apiKey or set TRIPO_API_KEY environment variable.'
      );
    }

    super({ ...config, apiKey });

    this.stsUploadEnabled = config.stsUpload ?? false;

    this.client = axios.create({
      baseURL: config.baseUrl || 'https://api.tripo3d.ai',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: config.timeout || 120000
    });

    // Register all supported task types
    this.supportedTaskTypes.add(TaskType.TEXT_TO_3D);
    this.supportedTaskTypes.add(TaskType.IMAGE_TO_3D);
    this.supportedTaskTypes.add(TaskType.MULTIVIEW_TO_3D);
    this.supportedTaskTypes.add(TaskType.TEXT_TO_IMAGE);
    this.supportedTaskTypes.add(TaskType.GENERATE_IMAGE);
    this.supportedTaskTypes.add(TaskType.TEXTURE);
    this.supportedTaskTypes.add(TaskType.REFINE);
    this.supportedTaskTypes.add(TaskType.PRE_RIG_CHECK);
    this.supportedTaskTypes.add(TaskType.RIG);
    this.supportedTaskTypes.add(TaskType.ANIMATE);
    this.supportedTaskTypes.add(TaskType.SEGMENT);
    this.supportedTaskTypes.add(TaskType.MESH_COMPLETION);
    this.supportedTaskTypes.add(TaskType.DECIMATE);
    this.supportedTaskTypes.add(TaskType.CONVERT);
    this.supportedTaskTypes.add(TaskType.IMPORT);
    this.supportedTaskTypes.add(TaskType.STYLIZE);
  }

  /**
   * Prepares input for the Tripo API.
   *
   * When stsUpload is enabled, local inputs (file paths, localhost URLs, base64)
   * are accepted and will be uploaded in the payload builder.
   * When disabled, only public URLs are accepted.
   *
   * @param input - Image input (URL, file path, or base64 when stsUpload enabled)
   * @returns The input string (passed through for later processing)
   */
  protected async prepareInput(input: ImageInput): Promise<string> {
    if (InputUtils.isUrl(input)) {
      return input;
    }

    if (this.stsUploadEnabled) {
      return input;
    }

    throw new Error(
      'TripoProvider requires URL inputs. Enable stsUpload in TripoConfig to use ' +
      'local file paths, localhost URLs, or base64 data.'
    );
  }

  // ============================================
  // File Upload Methods
  // ============================================

  /**
   * Checks if an input string refers to a local resource that cannot be
   * downloaded by Tripo's servers (localhost, file path, base64).
   * @internal
   */
  private isLocalInput(input: string): boolean {
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?/i.test(input)) return true;
    if (input.startsWith('file://')) return true;
    if (input.startsWith('/') || input.startsWith('./') || input.startsWith('../')) return true;
    if (input.startsWith('data:')) return true;
    if (input.length >= 100 && /^[A-Za-z0-9+/]+=*$/.test(input)) return true;
    return false;
  }

  /**
   * Detects file extension from a URL, file path, or data URI.
   * Falls back to the provided default or 'jpg'.
   * @internal
   */
  private detectFileExt(input: string, defaultExt = 'jpg'): string {
    // data URI: data:image/png;base64,...
    const dataMatch = input.match(/^data:(?:image|model|application)\/([a-zA-Z0-9.+-]+);/);
    if (dataMatch) {
      const mime = dataMatch[1].toLowerCase();
      return mime === 'jpeg' ? 'jpg' : mime;
    }

    // URL or file path: extract extension
    try {
      const pathname = input.startsWith('http') ? new URL(input).pathname : input;
      const ext = pathname.split('.').pop()?.toLowerCase()?.split('?')[0];
      if (ext && ext.length <= 5 && ext !== pathname.toLowerCase()) {
        return ext === 'jpeg' ? 'jpg' : ext;
      }
    } catch { /* ignore parse errors */ }

    return defaultExt;
  }

  /**
   * Fetches content from a URL or reads from a file path.
   * Works with both public and localhost URLs since it runs locally.
   * @internal
   */
  private async fetchContent(input: string): Promise<Buffer> {
    // Base64 data URI
    if (input.startsWith('data:')) {
      const base64Data = input.replace(/^data:[^;]+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    }

    // Raw base64
    if (input.length >= 100 && /^[A-Za-z0-9+/]+=*$/.test(input)) {
      return Buffer.from(input, 'base64');
    }

    // file:// protocol
    if (input.startsWith('file://')) {
      const { readFile } = await import('fs/promises');
      return readFile(input.replace(/^file:\/\//, ''));
    }

    // Local file path
    if (input.startsWith('/') || input.startsWith('./') || input.startsWith('../')) {
      const { readFile } = await import('fs/promises');
      return readFile(input);
    }

    // HTTP(S) URL — works for both public and localhost
    const response = await axios.get(input, { responseType: 'arraybuffer' });
    return Buffer.from(response.data);
  }

  /**
   * Uploads an image via Direct Upload (multipart/form-data).
   * @returns The image_token from Tripo
   * @internal
   */
  private async directUploadImage(data: Buffer, filename: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', new Blob([new Uint8Array(data)]), filename);

    const response = await this.client.post<TripoApiResponse<{ image_token: string }>>(
      '/v2/openapi/upload/sts',
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );

    if (response.data.code !== 0) {
      throw this.createTripoError(response.data.code, response.data.message, response.data);
    }

    return response.data.data.image_token;
  }

  /**
   * Uploads a file via STS Upload (get token + S3 PUT).
   * Used for 3D models and other non-image files.
   * @returns S3 object reference { bucket, key }
   * @internal
   */
  private async stsUploadFile(data: Buffer, format: string): Promise<{ bucket: string; key: string }> {
    // Step 1: Get STS token
    const tokenResponse = await this.client.post<TripoApiResponse<TripoStsTokenData>>(
      '/v2/openapi/upload/sts/token',
      { format }
    );

    if (tokenResponse.data.code !== 0) {
      throw this.createTripoError(
        tokenResponse.data.code, tokenResponse.data.message, tokenResponse.data
      );
    }

    const {
      s3_host, resource_bucket, resource_uri,
      session_token, sts_ak, sts_sk
    } = tokenResponse.data.data;

    // Extract region from s3_host (e.g., "s3.us-west-2.amazonaws.com" → "us-west-2")
    const regionMatch = s3_host.match(/s3\.([^.]+)\.amazonaws\.com/);
    const region = regionMatch?.[1] || 'us-west-2';

    // Step 2: Upload to S3
    await uploadToS3({
      host: s3_host,
      bucket: resource_bucket,
      key: resource_uri,
      accessKeyId: sts_ak,
      secretAccessKey: sts_sk,
      sessionToken: session_token,
      body: data,
      region
    });

    return { bucket: resource_bucket, key: resource_uri };
  }

  /**
   * Resolves a file input string to a Tripo file reference object.
   *
   * When stsUpload is enabled: fetches/reads the content and uploads it.
   *   - Images → Direct Upload → { type, file_token }
   *   - 3D models → STS Upload → { type, object: { bucket, key } }
   *
   * When stsUpload is disabled: wraps the URL in a file reference.
   *   - Public URLs → { type, url }
   *   - Local inputs → throws error
   *
   * @param input - URL, file path, or base64 data
   * @param defaultExt - Default file extension if detection fails
   * @returns File reference for use in API payloads
   * @internal
   */
  private async resolveFileRef(input: string, defaultExt = 'jpg'): Promise<TripoFileRef> {
    const ext = this.detectFileExt(input, defaultExt);

    if (this.stsUploadEnabled) {
      const content = await this.fetchContent(input);

      if (IMAGE_EXTS.has(ext)) {
        // Direct Upload for images
        const fileToken = await this.directUploadImage(content, `upload.${ext}`);
        return { type: ext, file_token: fileToken };
      } else {
        // STS Upload for 3D models and other files
        const obj = await this.stsUploadFile(content, ext);
        return { type: ext, object: obj };
      }
    }

    // stsUpload disabled: only public URLs allowed
    if (this.isLocalInput(input)) {
      throw new Error(
        'Local file inputs (localhost URLs, file paths, base64) require stsUpload to be enabled. ' +
        'Set { stsUpload: true } in your TripoProvider config.'
      );
    }

    return { type: ext, url: input };
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
    const payload = await this.buildPayload(params);

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
   * Async because file inputs may need to be uploaded when stsUpload is enabled.
   *
   * @param params - Task parameters
   * @returns API payload object
   */
  private async buildPayload(params: TaskParams<TripoOptions>): Promise<Record<string, unknown>> {
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
        file: await this.resolveFileRef(params.input),
        ...options
      };
    }

    // Multi-view to 3D (Tripo does not support prompt for multiview_to_model)
    // API expects exactly 4 elements [front, left, back, right].
    // Omitted views must be empty objects {}, not filtered out.
    if (isMultiviewTo3DParams(params)) {
      const files = await Promise.all(
        params.inputs.map(async (url) =>
          url ? await this.resolveFileRef(url) : {}
        )
      );
      return {
        type: 'multiview_to_model',
        files,
        ...options
      };
    }

    // Texture
    if (isTextureParams(params)) {
      const payload: Record<string, unknown> = {
        type: 'texture_model',
        original_model_task_id: params.taskId
      };
      const texturePrompt: Record<string, unknown> = {};
      if (params.prompt) {
        texturePrompt.text = params.prompt;
      }
      if (params.styleImage) {
        texturePrompt.style_image = await this.resolveFileRef(params.styleImage);
      }
      if (Object.keys(texturePrompt).length > 0) {
        payload.texture_prompt = texturePrompt;
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
      if (this.stsUploadEnabled) {
        const ext = this.detectFileExt(params.input, 'glb');
        return {
          type: 'import_model',
          file: await this.resolveFileRef(params.input, ext),
          ...options
        };
      }
      // Without stsUpload: input is an existing S3 key
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

    // Text to Image
    if (isTextToImageParams(params)) {
      return {
        type: 'text_to_image',
        prompt: params.prompt,
        ...(params.negative_prompt && { negative_prompt: params.negative_prompt }),
        ...options
      };
    }

    // Advanced Generate Image
    if (isGenerateImageParams(params)) {
      const payload: Record<string, unknown> = {
        type: 'generate_image',
        prompt: params.prompt
      };
      if (params.input) {
        payload.file = await this.resolveFileRef(params.input);
      }
      if (params.inputs && params.inputs.length > 0) {
        payload.files = await Promise.all(
          params.inputs.map((url) => this.resolveFileRef(url))
        );
      }
      return { ...payload, ...options };
    }

    // Mesh Completion
    if (isMeshCompletionParams(params)) {
      return {
        type: 'mesh_completion',
        original_model_task_id: params.taskId,
        ...(params.partNames && { part_names: params.partNames }),
        ...options
      };
    }

    // Pre-Rig Check
    if (isPreRigCheckParams(params)) {
      return {
        type: 'animate_prerigcheck',
        original_model_task_id: params.taskId,
        ...options
      };
    }

    // Stylize
    if (isStylizeParams(params)) {
      return {
        type: 'stylize_model',
        original_model_task_id: params.taskId,
        style: params.style,
        ...options
      };
    }

    // Refine
    if (isRefineParams(params)) {
      return {
        type: 'refine_model',
        draft_model_task_id: params.taskId,
        ...options
      };
    }

    throw new Error(`Unsupported task type: ${params.type}`);
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
      createdAt: Date.now(),
      rawResponse: { tripoCode, message }
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
      'text_to_image': TaskType.TEXT_TO_IMAGE,
      'generate_image': TaskType.GENERATE_IMAGE,
      'texture_model': TaskType.TEXTURE,
      'refine_model': TaskType.REFINE,
      'animate_prerigcheck': TaskType.PRE_RIG_CHECK,
      'animate_rig': TaskType.RIG,
      'animate_retarget': TaskType.ANIMATE,
      'mesh_segmentation': TaskType.SEGMENT,
      'mesh_completion': TaskType.MESH_COMPLETION,
      'highpoly_to_lowpoly': TaskType.DECIMATE,
      'convert_model': TaskType.CONVERT,
      'import_model': TaskType.IMPORT,
      'stylize_model': TaskType.STYLIZE
    };

    const sdkStatus = statusMap[data.status] || TaskStatus.PROCESSING;
    const sdkType = taskTypeMap[data.type] || TaskType.IMAGE_TO_3D;

    // Build result artifacts if task succeeded
    // Priority for primary model: pbr_model > model > base_model
    let result: TaskArtifacts | undefined;
    if (data.status === 'success' && data.output) {
      const { model, pbr_model, base_model, rendered_image, generated_image, generated_video, riggable, rig_type } = data.output;

      // Primary model URL - best available output
      const primaryModel = pbr_model || model || base_model || '';

      result = {
        model: primaryModel,
        modelGlb: primaryModel || undefined,
        modelPbr: pbr_model,
        modelBase: base_model,
        thumbnail: rendered_image,
        video: generated_video,
        generatedImage: generated_image,
        riggable,
        rigType: rig_type
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
        : undefined,
      rawResponse: data
    };
  }
}

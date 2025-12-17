/**
 * @module providers/HunyuanProvider
 * @description Hunyuan (Tencent Cloud) provider implementation for 3D model generation
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AbstractProvider, ImageInput } from '../core/AbstractProvider';
import { ApiError } from '../core/Magi3DClient';
import {
  TaskParams,
  StandardTask,
  TaskStatus,
  TaskType,
  ProviderId,
  HunyuanConfig,
  HunyuanOptions,
  TaskArtifacts,
  isTextTo3DParams,
  isImageTo3DParams,
  isTextureParams,
  isDecimateParams,
  isUVUnwrapParams,
  isSegmentParams,
  isConvertParams
} from '../types';
import { TencentCloudSigner } from '../utils/TencentCloudSigner';
import { InputUtils } from '../utils/InputUtils';

// ============================================
// Hunyuan Error Code Mapping
// ============================================

/**
 * Hunyuan 公共错误码 (Common Error Codes) mapping to SDK error codes
 * @see https://cloud.tencent.com/document/product/xxx/error-codes
 * @internal
 */
const HUNYUAN_ERROR_CODE_MAP: Record<string, string> = {
  // Authentication errors
  'AuthFailure.InvalidAuthorization': 'INVALID_AUTHORIZATION',
  'AuthFailure.InvalidSecretId': 'INVALID_SECRET_ID',
  'AuthFailure.SecretIdNotFound': 'SECRET_ID_NOT_FOUND',
  'AuthFailure.SignatureExpire': 'SIGNATURE_EXPIRED',
  'AuthFailure.SignatureFailure': 'SIGNATURE_FAILURE',
  'AuthFailure.TokenFailure': 'TOKEN_FAILURE',
  'AuthFailure.MFAFailure': 'MFA_FAILURE',
  'AuthFailure.UnauthorizedOperation': 'UNAUTHORIZED_OPERATION',
  // Parameter errors
  'InvalidParameter': 'INVALID_PARAMETER',
  'InvalidParameterValue': 'INVALID_PARAMETER_VALUE',
  'MissingParameter': 'MISSING_PARAMETER',
  'UnknownParameter': 'UNKNOWN_PARAMETER',
  // Rate limit errors
  'RequestLimitExceeded': 'RATE_LIMIT_EXCEEDED',
  'RequestLimitExceeded.IPLimitExceeded': 'IP_RATE_LIMIT_EXCEEDED',
  'RequestLimitExceeded.UinLimitExceeded': 'ACCOUNT_RATE_LIMIT_EXCEEDED',
  // Resource errors
  'ResourceNotFound': 'RESOURCE_NOT_FOUND',
  'ResourceInUse': 'RESOURCE_IN_USE',
  'ResourceInsufficient': 'RESOURCE_INSUFFICIENT',
  'ResourceUnavailable': 'RESOURCE_UNAVAILABLE',
  // Operation errors
  'FailedOperation': 'OPERATION_FAILED',
  'InvalidAction': 'INVALID_ACTION',
  'UnsupportedOperation': 'UNSUPPORTED_OPERATION',
  'UnauthorizedOperation': 'UNAUTHORIZED_OPERATION',
  // Service errors
  'InternalError': 'INTERNAL_ERROR',
  'ServiceUnavailable': 'SERVICE_UNAVAILABLE',
  'ActionOffline': 'ACTION_OFFLINE',
  // Request errors
  'InvalidRequest': 'INVALID_REQUEST',
  'RequestSizeLimitExceeded': 'REQUEST_SIZE_EXCEEDED',
  'ResponseSizeLimitExceeded': 'RESPONSE_SIZE_EXCEEDED',
  'UnsupportedProtocol': 'UNSUPPORTED_PROTOCOL',
  'UnsupportedRegion': 'UNSUPPORTED_REGION',
  // IP restrictions
  'IpInBlacklist': 'IP_BLACKLISTED',
  'IpNotInWhitelist': 'IP_NOT_WHITELISTED',
  // Other
  'LimitExceeded': 'LIMIT_EXCEEDED',
  'NoSuchProduct': 'NO_SUCH_PRODUCT',
  'NoSuchVersion': 'NO_SUCH_VERSION',
  'DryRunOperation': 'DRY_RUN_OPERATION'
};

/**
 * Maps Hunyuan error code to SDK error code
 * @internal
 */
function mapHunyuanErrorCode(hunyuanCode: string): string {
  // Try exact match first
  if (HUNYUAN_ERROR_CODE_MAP[hunyuanCode]) {
    return HUNYUAN_ERROR_CODE_MAP[hunyuanCode];
  }
  // Try prefix match (e.g., AuthFailure.* → check AuthFailure)
  const prefix = hunyuanCode.split('.')[0];
  if (HUNYUAN_ERROR_CODE_MAP[prefix]) {
    return HUNYUAN_ERROR_CODE_MAP[prefix];
  }
  // Return original code as fallback
  return hunyuanCode;
}

// ============================================
// Hunyuan API Types (Internal)
// ============================================

/**
 * Hunyuan API response wrapper
 * @internal
 */
interface HunyuanApiResponse {
  Response: {
    JobId?: string;
    RequestId: string;
    Status?: string;
    ErrorCode?: string;
    ErrorMessage?: string;
    ResultFile3Ds?: Array<{
      Type: string;
      Url: string;
      PreviewImageUrl?: string;
    }>;
    ResultFile3D?: string; // For sync Convert3DFormat
    Error?: {
      Code: string;
      Message: string;
    };
  };
}

/**
 * Task metadata stored for status queries
 * @internal
 */
interface TaskMetadata {
  taskType: TaskType;
  queryAction: string;
}

// ============================================
// Action Mappings
// ============================================

/**
 * Maps SDK TaskType to Hunyuan submit/query actions
 */
const ACTION_MAP: Record<string, { submit: string; query: string }> = {
  // Pro version for primary generation (better quality, slower)
  [TaskType.TEXT_TO_3D]: { submit: 'SubmitHunyuanTo3DProJob', query: 'QueryHunyuanTo3DProJob' },
  [TaskType.IMAGE_TO_3D]: { submit: 'SubmitHunyuanTo3DProJob', query: 'QueryHunyuanTo3DProJob' },
  // Post-processing
  [TaskType.TEXTURE]: { submit: 'SubmitTextureTo3DJob', query: 'DescribeTextureTo3DJob' },
  [TaskType.DECIMATE]: { submit: 'SubmitReduceFaceJob', query: 'DescribeReduceFaceJob' },
  [TaskType.UV_UNWRAP]: { submit: 'SubmitHunyuanTo3DUVJob', query: 'DescribeHunyuanTo3DUVJob' },
  [TaskType.SEGMENT]: { submit: 'SubmitHunyuan3DPartJob', query: 'QueryHunyuan3DPartJob' },
  [TaskType.CONVERT]: { submit: 'Convert3DFormat', query: '' } // Sync, no query needed
};

// ============================================
// Provider Implementation
// ============================================

/**
 * Hunyuan (Tencent Cloud) provider for 3D model generation.
 *
 * @remarks
 * Hunyuan is Tencent's AI 3D generation service offering:
 * - **Text-to-3D**: Generate models from text descriptions (Pro/Rapid versions)
 * - **Image-to-3D**: Convert images to 3D models
 * - **Post-processing**: Texturing, decimation, UV unwrap, part generation
 * - **Format conversion**: Sync conversion between formats
 *
 * **Supported Task Types:**
 * - {@link TaskType.TEXT_TO_3D} - Text to 3D model
 * - {@link TaskType.IMAGE_TO_3D} - Image to 3D model
 * - {@link TaskType.TEXTURE} - Re-texture model
 * - {@link TaskType.DECIMATE} - Reduce face count (智能拓扑)
 * - {@link TaskType.UV_UNWRAP} - UV展开
 * - {@link TaskType.SEGMENT} - Part generation (组件生成)
 * - {@link TaskType.CONVERT} - Format conversion (sync)
 *
 * **Authentication:**
 * Uses TC3-HMAC-SHA256 signing with SecretId and SecretKey from Tencent Cloud.
 *
 * @example
 * ```typescript
 * import { HunyuanProvider, Magi3DClient, TaskType } from 'magi-3d/server';
 *
 * const provider = new HunyuanProvider({
 *   secretId: process.env.TENCENT_SECRET_ID!,
 *   secretKey: process.env.TENCENT_SECRET_KEY!,
 *   region: 'ap-guangzhou'
 * });
 *
 * const client = new Magi3DClient(provider);
 *
 * // Image-to-3D generation
 * const taskId = await client.createTask({
 *   type: TaskType.IMAGE_TO_3D,
 *   input: 'https://example.com/cat.jpg',
 *   providerOptions: {
 *     EnablePBR: true,
 *     FaceCount: 500000
 *   }
 * });
 *
 * const result = await client.pollUntilDone(taskId);
 * console.log('Model:', result.result?.modelGlb);
 * ```
 */
export class HunyuanProvider extends AbstractProvider<HunyuanConfig> {
  /** Provider name identifier */
  readonly name = 'Hunyuan';

  /** API version */
  private readonly apiVersion = '2025-05-13';

  /** Service name for signing */
  private readonly service = 'ai3d';

  /** API host */
  private readonly host: string;

  /** Axios HTTP client */
  private client: AxiosInstance;

  /** Task metadata cache for status queries */
  private taskMetadata: Map<string, TaskMetadata> = new Map();

  /**
   * Creates a new HunyuanProvider instance.
   *
   * @param config - Hunyuan API configuration
   */
  constructor(config: HunyuanConfig) {
    super(config);

    // Use regional endpoint or default
    this.host = config.endpoint || `ai3d.${config.region || 'ap-guangzhou'}.tencentcloudapi.com`;

    this.client = axios.create({
      baseURL: `https://${this.host}`,
      timeout: config.timeout || 120000
    });

    // Register supported task types
    this.supportedTaskTypes.add(TaskType.TEXT_TO_3D);
    this.supportedTaskTypes.add(TaskType.IMAGE_TO_3D);
    this.supportedTaskTypes.add(TaskType.TEXTURE);
    this.supportedTaskTypes.add(TaskType.DECIMATE);
    this.supportedTaskTypes.add(TaskType.UV_UNWRAP);
    this.supportedTaskTypes.add(TaskType.SEGMENT);
    this.supportedTaskTypes.add(TaskType.CONVERT);
  }

  /**
   * Prepares input for the Hunyuan API.
   *
   * @remarks
   * Hunyuan accepts both URL (ImageUrl) and base64 (ImageBase64) inputs.
   * This method validates the format and returns the input as-is.
   *
   * @param input - Image input (URL or base64 string)
   * @returns The validated input string
   */
  protected async prepareInput(input: ImageInput): Promise<string> {
    // Validate the input format
    InputUtils.validate(input);
    return input;
  }

  /**
   * Creates a task via the Hunyuan API.
   */
  protected async doCreateTask(params: TaskParams<HunyuanOptions>): Promise<string> {
    const actionInfo = ACTION_MAP[params.type];
    if (!actionInfo) {
      throw new Error(`Unsupported task type for Hunyuan: ${params.type}`);
    }

    const payload = this.buildPayload(params);
    const payloadStr = JSON.stringify(payload);

    // Sign the request
    const headers = TencentCloudSigner.sign({
      secretId: this.config.secretId,
      secretKey: this.config.secretKey,
      service: this.service,
      host: this.host,
      region: this.config.region || 'ap-guangzhou',
      action: actionInfo.submit,
      version: this.apiVersion,
      payload: payloadStr
    });

    const response: AxiosResponse<HunyuanApiResponse> = await this.client.post('/', payloadStr, { headers });
    const apiResponse = response.data.Response;

    // Check for API error (公共错误码)
    if (apiResponse.Error) {
      const sdkCode = mapHunyuanErrorCode(apiResponse.Error.Code);
      throw new ApiError(
        `Hunyuan API error: ${apiResponse.Error.Message}`,
        sdkCode,
        response.data  // Include full raw response
      );
    }

    // Handle sync Convert3DFormat (returns result directly, no JobId)
    if (params.type === TaskType.CONVERT && apiResponse.ResultFile3D) {
      // Create a synthetic task ID and store the result
      const syntheticId = `convert_${Date.now()}`;
      // Store as completed in metadata
      this.taskMetadata.set(syntheticId, {
        taskType: TaskType.CONVERT,
        queryAction: ''
      });
      // We'll handle this specially in getTaskStatus
      return syntheticId;
    }

    const jobId = apiResponse.JobId;
    if (!jobId) {
      throw new Error('No JobId returned from Hunyuan API');
    }

    // Store task metadata for status queries
    this.taskMetadata.set(jobId, {
      taskType: params.type,
      queryAction: actionInfo.query
    });

    return jobId;
  }

  /**
   * Builds the Hunyuan API payload based on task type.
   */
  private buildPayload(params: TaskParams<HunyuanOptions>): Record<string, unknown> {
    const options = params.providerOptions || {};

    // Text-to-3D
    if (isTextTo3DParams(params)) {
      return {
        Prompt: params.prompt,
        ...this.mapProviderOptions(options)
      };
    }

    // Image-to-3D (Hunyuan does not support prompt for image-to-3D)
    if (isImageTo3DParams(params)) {
      // Detect input type and use appropriate field
      const isUrl = InputUtils.isUrl(params.input);
      return {
        ...(isUrl
          ? { ImageUrl: params.input }
          : { ImageBase64: InputUtils.extractBase64(params.input) }),
        ...this.mapProviderOptions(options)
      };
    }

    // Texture
    if (isTextureParams(params)) {
      const payload: Record<string, unknown> = {
        File3D: {
          Type: 'GLB',
          Url: params.taskId // taskId should be the model URL for Hunyuan
        }
      };
      if (params.prompt) {
        payload.Prompt = params.prompt;
      }
      if (params.styleImage) {
        payload.Image = { Url: params.styleImage };
      }
      if (params.enablePBR !== undefined) {
        payload.EnablePBR = params.enablePBR;
      }
      return payload;
    }

    // Decimate (ReduceFace)
    if (isDecimateParams(params)) {
      return {
        File3D: {
          Type: 'GLB',
          Url: params.taskId
        },
        ...(params.quad && { PolygonType: 'quadrilateral' }),
        ...options
      };
    }

    // UV Unwrap
    if (isUVUnwrapParams(params)) {
      return {
        File: {
          Type: 'GLB',
          Url: params.modelUrl || params.taskId
        }
      };
    }

    // Segment (Part Generation)
    if (isSegmentParams(params)) {
      return {
        File: {
          Type: 'FBX',
          Url: params.taskId
        }
      };
    }

    // Convert
    if (isConvertParams(params)) {
      return {
        File3D: params.taskId,
        Format: params.format.toUpperCase()
      };
    }

    throw new Error(`Unsupported task type: ${params.type}`);
  }

  /**
   * Maps SDK options to Hunyuan-specific options
   */
  private mapProviderOptions(options: HunyuanOptions): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};

    if (options.EnablePBR !== undefined) mapped.EnablePBR = options.EnablePBR;
    if (options.FaceCount !== undefined) mapped.FaceCount = options.FaceCount;
    if (options.GenerateType !== undefined) mapped.GenerateType = options.GenerateType;
    if (options.PolygonType !== undefined) mapped.PolygonType = options.PolygonType;
    if (options.ResultFormat !== undefined) mapped.ResultFormat = options.ResultFormat;
    if (options.EnableGeometry !== undefined) mapped.EnableGeometry = options.EnableGeometry;
    if (options.FaceLevel !== undefined) mapped.FaceLevel = options.FaceLevel;

    return mapped;
  }

  /**
   * Fetches and normalizes task status from the Hunyuan API.
   */
  async getTaskStatus(taskId: string): Promise<StandardTask> {
    const metadata = this.taskMetadata.get(taskId);

    // Handle sync convert task (already completed)
    if (taskId.startsWith('convert_')) {
      return {
        id: taskId,
        provider: ProviderId.HUNYUAN,
        type: TaskType.CONVERT,
        status: TaskStatus.SUCCEEDED,
        progress: 100,
        createdAt: Date.now()
      };
    }

    if (!metadata) {
      throw new Error(`Unknown task ID: ${taskId}. Task metadata not found.`);
    }

    const payload = JSON.stringify({ JobId: taskId });

    const headers = TencentCloudSigner.sign({
      secretId: this.config.secretId,
      secretKey: this.config.secretKey,
      service: this.service,
      host: this.host,
      region: this.config.region || 'ap-guangzhou',
      action: metadata.queryAction,
      version: this.apiVersion,
      payload
    });

    const response: AxiosResponse<HunyuanApiResponse> = await this.client.post('/', payload, { headers });
    const apiResponse = response.data.Response;

    // Check for API error (公共错误码)
    if (apiResponse.Error) {
      const sdkCode = mapHunyuanErrorCode(apiResponse.Error.Code);
      throw new ApiError(
        `Hunyuan API error: ${apiResponse.Error.Message}`,
        sdkCode,
        response.data  // Include full raw response
      );
    }

    return this.normalizeHunyuanResponse(taskId, metadata.taskType, apiResponse);
  }

  /**
   * Normalizes Hunyuan API response to SDK StandardTask format.
   */
  private normalizeHunyuanResponse(
    taskId: string,
    taskType: TaskType,
    data: HunyuanApiResponse['Response']
  ): StandardTask {
    // Map Hunyuan status to SDK TaskStatus
    const statusMap: Record<string, TaskStatus> = {
      'WAIT': TaskStatus.PENDING,
      'RUN': TaskStatus.PROCESSING,
      'DONE': TaskStatus.SUCCEEDED,
      'FAIL': TaskStatus.FAILED
    };

    const sdkStatus = statusMap[data.Status || ''] || TaskStatus.PROCESSING;

    // Build result artifacts if task succeeded
    let result: TaskArtifacts | undefined;
    if (data.Status === 'DONE' && data.ResultFile3Ds && data.ResultFile3Ds.length > 0) {
      result = {
        modelGlb: '',
        modelObj: undefined,
        thumbnail: undefined
      };

      for (const file of data.ResultFile3Ds) {
        switch (file.Type.toUpperCase()) {
          case 'GLB':
            result.modelGlb = file.Url;
            break;
          case 'OBJ':
            result.modelObj = file.Url;
            break;
          case 'FBX':
            result.modelFbx = file.Url;
            break;
          case 'IMAGE':
          case 'PREVIEW_IMAGE':
            result.thumbnail = file.Url;
            break;
        }

        // Also use PreviewImageUrl if available
        if (file.PreviewImageUrl) {
          result.thumbnail = file.PreviewImageUrl;
        }
      }
    }

    // Build error object if task failed
    // ErrorCode comes from Hunyuan when Status === 'FAIL'
    let error: StandardTask['error'];
    if (sdkStatus === TaskStatus.FAILED) {
      const sdkCode = data.ErrorCode
        ? mapHunyuanErrorCode(data.ErrorCode)
        : 'GENERATION_FAILED';
      error = {
        code: sdkCode,
        message: data.ErrorMessage || 'Model generation failed',
        raw: data
      };
    }

    // Estimate progress based on status
    let progress = 0;
    if (sdkStatus === TaskStatus.PENDING) progress = 0;
    else if (sdkStatus === TaskStatus.PROCESSING) progress = 50;
    else if (sdkStatus === TaskStatus.SUCCEEDED) progress = 100;

    return {
      id: taskId,
      provider: ProviderId.HUNYUAN,
      type: taskType,
      status: sdkStatus,
      progress,
      progressDetail: data.Status,
      result,
      error,
      createdAt: Date.now()
    };
  }
}

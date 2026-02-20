// src/types/config.ts
/**
 * @module types/config
 * @description Provider configuration type definitions
 */

/**
 * Base configuration interface for all providers.
 *
 * @remarks
 * Extended by provider-specific configurations like {@link TripoConfig}.
 */
export interface ProviderConfig {
  /** Optional API key for authentication */
  apiKey?: string;
  /** Request timeout in milliseconds (default: 120000) */
  timeout?: number;
  /** Maximum number of retries for failed requests (default: 3) */
  maxRetries?: number;
}

/**
 * Configuration for Tripo provider.
 * If apiKey is not provided, it will be read from TRIPO_API_KEY environment variable.
 * @see https://platform.tripo3d.ai/docs
 */
export interface TripoConfig extends ProviderConfig {
  /** Tripo API key. Falls back to process.env.TRIPO_API_KEY if not provided. */
  apiKey?: string;
  /** Custom API base URL (default: https://api.tripo3d.ai) */
  baseUrl?: string;
  /**
   * Enable STS upload for file inputs.
   *
   * When enabled, all file inputs (public URLs, localhost URLs, file paths, base64)
   * are fetched/read locally and uploaded to Tripo's S3 storage before task creation.
   * Images use Direct Upload, 3D models use STS Upload.
   *
   * When disabled (default), only public URLs are accepted as file inputs.
   * Local file paths and localhost URLs will throw an error.
   *
   * @default false
   */
  stsUpload?: boolean;
}

/**
 * Configuration for Hunyuan (Tencent Cloud) provider.
 * Uses Tencent Cloud's TC3-HMAC-SHA256 authentication.
 * If credentials are not provided, they will be read from environment variables.
 * @see https://cloud.tencent.com/document/product/...
 */
export interface HunyuanConfig extends ProviderConfig {
  /** Tencent Cloud Secret ID. Falls back to process.env.HUNYUAN_SECRET_ID if not provided. */
  secretId?: string;
  /** Tencent Cloud Secret Key. Falls back to process.env.HUNYUAN_SECRET_KEY if not provided. */
  secretKey?: string;
  /** Service region (default: ap-guangzhou) */
  region?: string;
  /** Custom API endpoint */
  endpoint?: string;
}

 

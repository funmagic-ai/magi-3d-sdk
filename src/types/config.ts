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
 * Configuration for Tripo provider
 * @see https://platform.tripo3d.ai/docs
 */
export interface TripoConfig extends ProviderConfig {
  /** Tripo API key (required) */
  apiKey: string;
  /** Custom API base URL (default: https://api.tripo3d.ai) */
  baseUrl?: string;
}

/**
 * Configuration for Hunyuan (Tencent Cloud) provider
 * Uses Tencent Cloud's TC3-HMAC-SHA256 authentication
 * @see https://cloud.tencent.com/document/product/...
 */
export interface HunyuanConfig extends ProviderConfig {
  /** Tencent Cloud Secret ID (required) */
  secretId: string;
  /** Tencent Cloud Secret Key (required) */
  secretKey: string;
  /** Service region (default: ap-guangzhou) */
  region?: string;
  /** Custom API endpoint */
  endpoint?: string;
}

 

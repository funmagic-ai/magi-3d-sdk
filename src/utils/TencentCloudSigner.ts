/**
 * @module utils/TencentCloudSigner
 * @description TC3-HMAC-SHA256 signing utility for Tencent Cloud API
 */

import crypto from 'crypto';

/**
 * Configuration for signing a Tencent Cloud API request
 */
export interface SigningConfig {
  secretId: string;
  secretKey: string;
  service: string;
  host: string;
  region: string;
  action: string;
  version: string;
  payload: string;
  timestamp?: number;
}

/**
 * Signed request headers ready to use with HTTP client
 */
export interface SignedHeaders {
  'Content-Type': string;
  'Host': string;
  'X-TC-Action': string;
  'X-TC-Version': string;
  'X-TC-Timestamp': string;
  'X-TC-Region': string;
  'Authorization': string;
  [key: string]: string; // Index signature for Axios compatibility
}

/**
 * Create HMAC-SHA256 hash
 */
function sha256(message: string, secret: string | Buffer, encoding: 'hex' | 'buffer' = 'buffer'): string | Buffer {
  const hmac = crypto.createHmac('sha256', secret);
  if (encoding === 'hex') {
    return hmac.update(message).digest('hex');
  }
  return hmac.update(message).digest();
}

/**
 * Create SHA256 hash
 */
function getHash(message: string): string {
  const hash = crypto.createHash('sha256');
  return hash.update(message).digest('hex');
}

/**
 * Get UTC date string (YYYY-MM-DD)
 */
function getDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = ('0' + (date.getUTCMonth() + 1)).slice(-2);
  const day = ('0' + date.getUTCDate()).slice(-2);
  return `${year}-${month}-${day}`;
}

/**
 * TC3-HMAC-SHA256 Signer for Tencent Cloud API
 *
 * @remarks
 * Implements the signing algorithm v3 as described in:
 * https://cloud.tencent.com/document/api/213/30654
 *
 * @example
 * ```typescript
 * const headers = TencentCloudSigner.sign({
 *   secretId: 'AKID...',
 *   secretKey: '...',
 *   service: 'ai3d',
 *   host: 'ai3d.tencentcloudapi.com',
 *   region: 'ap-guangzhou',
 *   action: 'SubmitHunyuanTo3DProJob',
 *   version: '2025-05-13',
 *   payload: JSON.stringify({ ImageUrl: '...' })
 * });
 * ```
 */
export const TencentCloudSigner = {
  /**
   * Sign a Tencent Cloud API request using TC3-HMAC-SHA256
   *
   * @param config - Signing configuration
   * @returns Signed headers ready to use with HTTP client
   */
  sign(config: SigningConfig): SignedHeaders {
    const {
      secretId,
      secretKey,
      service,
      host,
      region,
      action,
      version,
      payload
    } = config;

    const timestamp = config.timestamp || Math.floor(Date.now() / 1000);
    const date = getDate(timestamp);

    // Step 1: Build canonical request
    const hashedRequestPayload = getHash(payload);
    const httpRequestMethod = 'POST';
    const canonicalUri = '/';
    const canonicalQueryString = '';
    const canonicalHeaders =
      'content-type:application/json; charset=utf-8\n' +
      'host:' + host + '\n' +
      'x-tc-action:' + action.toLowerCase() + '\n';
    const signedHeaders = 'content-type;host;x-tc-action';

    const canonicalRequest =
      httpRequestMethod + '\n' +
      canonicalUri + '\n' +
      canonicalQueryString + '\n' +
      canonicalHeaders + '\n' +
      signedHeaders + '\n' +
      hashedRequestPayload;

    // Step 2: Build string to sign
    const algorithm = 'TC3-HMAC-SHA256';
    const hashedCanonicalRequest = getHash(canonicalRequest);
    const credentialScope = date + '/' + service + '/tc3_request';
    const stringToSign =
      algorithm + '\n' +
      timestamp + '\n' +
      credentialScope + '\n' +
      hashedCanonicalRequest;

    // Step 3: Calculate signature
    const kDate = sha256(date, 'TC3' + secretKey) as Buffer;
    const kService = sha256(service, kDate) as Buffer;
    const kSigning = sha256('tc3_request', kService) as Buffer;
    const signature = sha256(stringToSign, kSigning, 'hex') as string;

    // Step 4: Build Authorization header
    const authorization =
      algorithm + ' ' +
      'Credential=' + secretId + '/' + credentialScope + ', ' +
      'SignedHeaders=' + signedHeaders + ', ' +
      'Signature=' + signature;

    return {
      'Content-Type': 'application/json; charset=utf-8',
      'Host': host,
      'X-TC-Action': action,
      'X-TC-Version': version,
      'X-TC-Timestamp': timestamp.toString(),
      'X-TC-Region': region,
      'Authorization': authorization
    };
  }
};

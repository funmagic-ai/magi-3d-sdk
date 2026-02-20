/**
 * @module utils/s3-upload
 * @description Minimal AWS SigV4 signer for S3 PUT operations.
 * Uses only Node.js built-in crypto module — no AWS SDK dependency.
 */

import { createHmac, createHash } from 'crypto';
import axios from 'axios';

export interface S3UploadParams {
  /** S3 host (e.g., "s3.us-west-2.amazonaws.com") */
  host: string;
  /** S3 bucket name */
  bucket: string;
  /** S3 object key (resource_uri from STS token) */
  key: string;
  /** Temporary AWS access key ID */
  accessKeyId: string;
  /** Temporary AWS secret access key */
  secretAccessKey: string;
  /** Temporary session token */
  sessionToken: string;
  /** File content to upload */
  body: Buffer;
  /** AWS region (default: "us-west-2") */
  region?: string;
}

function sha256(data: string | Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data).digest();
}

function hmacHex(key: string | Buffer, data: string): string {
  return createHmac('sha256', key).update(data).digest('hex');
}

/**
 * Uploads a file to S3 using temporary STS credentials with AWS SigV4 signing.
 *
 * @param params - Upload parameters including STS credentials and file content
 * @throws Error if the upload fails
 */
export async function uploadToS3(params: S3UploadParams): Promise<void> {
  const {
    host, bucket, key,
    accessKeyId, secretAccessKey, sessionToken,
    body
  } = params;
  const region = params.region || 'us-west-2';

  // Timestamp in AWS format
  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const dateStamp = amzDate.substring(0, 8);

  // Virtual-hosted-style: {bucket}.{host}
  const hostname = `${bucket}.${host}`;
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  const contentHash = sha256(body);

  // Canonical headers (alphabetically sorted)
  const canonicalHeaders =
    `content-type:application/octet-stream\n` +
    `host:${hostname}\n` +
    `x-amz-content-sha256:${contentHash}\n` +
    `x-amz-date:${amzDate}\n` +
    `x-amz-security-token:${sessionToken}\n`;

  const signedHeaders = 'content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token';

  // Canonical request
  const canonicalRequest = [
    'PUT',
    `/${encodedKey}`,
    '',  // empty query string
    canonicalHeaders,
    signedHeaders,
    contentHash
  ].join('\n');

  // String to sign
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    sha256(canonicalRequest)
  ].join('\n');

  // Derive signing key
  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');

  // Calculate signature
  const signature = hmacHex(kSigning, stringToSign);

  // Build Authorization header
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  // Upload to S3
  const url = `https://${hostname}/${encodedKey}`;

  await axios.put(url, body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Host': hostname,
      'X-Amz-Content-Sha256': contentHash,
      'X-Amz-Date': amzDate,
      'X-Amz-Security-Token': sessionToken,
      'Authorization': authorization
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });
}
